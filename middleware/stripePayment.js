import stripe from 'stripe';

const stripeAPIKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripe(stripeAPIKey);

export const createSubscriptionProduct = async () => {
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Premium Feature',
            },
            unit_amount: 5000,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'http://localhost:3000/organization/register?success=true',
      cancel_url: 'http://localhost:3000/organization/register?canceled=true',
    });

    return { id: session.id };

  } catch (error) {
    console.error('Error creating subscription product:', error.message);
  }
}