import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async getSubscription(restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
      include: {
        restaurant: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  async createCheckoutSession(restaurantId: string, plan: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: { 
        subscription: true,
        owner: {
          select: {
            phone: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Get or create Stripe customer
    let customerId = restaurant.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: restaurant.email || `${restaurant.owner.phone}@restaurant.local`, // Stripe requires email, use phone as fallback
        metadata: {
          restaurantId,
        },
      });
      customerId = customer.id;
    }

    // Get price ID for plan
    const priceId = this.getPriceIdForPlan(plan);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/dashboard/subscription`,
      metadata: {
        restaurantId,
        plan,
      },
    });

    return { sessionId: session.id, url: session.url };
  }

  async handleWebhook(payload: any, signature: string) {
    const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const restaurantId = session.metadata?.restaurantId;
    const plan = session.metadata?.plan as any;

    if (!restaurantId) {
      return;
    }

    const subscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );

    await this.prisma.subscription.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        plan,
        status: this.mapStripeStatus(subscription.status),
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
      update: {
        plan,
        status: this.mapStripeStatus(subscription.status),
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        subscription: {
          stripeSubscriptionId: subscription.id,
        },
      },
    });

    if (!restaurant) {
      return;
    }

    await this.prisma.subscription.update({
      where: { restaurantId: restaurant.id },
      data: {
        status: this.mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  private mapStripeStatus(status: string): any {
    const statusMap: Record<string, any> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELLED',
      unpaid: 'CANCELLED',
    };
    return statusMap[status] || 'ACTIVE';
  }

  private getPriceIdForPlan(plan: string): string {
    const priceMap: Record<string, string> = {
      PRO: this.configService.get('STRIPE_PRICE_ID_PRO') || '',
      ENTERPRISE: this.configService.get('STRIPE_PRICE_ID_ENTERPRISE') || '',
    };
    return priceMap[plan] || '';
  }

  async cancelSubscription(restaurantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { restaurantId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new NotFoundException('Subscription not found');
    }

    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return this.prisma.subscription.update({
      where: { restaurantId },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  }
}
