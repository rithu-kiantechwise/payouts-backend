import stripe from 'stripe';

const stripeAPIKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripe(stripeAPIKey);

export const createSubscriptionProduct = async (data) => {
  console.log(data.totalPrice,'data.totollll');
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Payouts premium',
            },
            unit_amount: data.totalPrice * 100,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `https://www.payouts.online/organization/register?success=true`,
      cancel_url: `https://www.payouts.online/organization/register?canceled=true`,
    });

    return { id: session.id };

  } catch (error) {
    console.error('Error creating subscription product:', error.message);
  }
}