import Stripe from 'stripe';

let stripeClient: Stripe;

const getClient = () => {
    if (!stripeClient) {
        stripeClient = new Stripe(
            process.env.STRIPE_SECRET_KEY!,
            {
                apiVersion: '2025-06-30.basil', // Required API version
                typescript: true
            }
        );
    }
    return stripeClient;
}

const isDev = process.env.NODE_ENV === 'development';
const success_url = isDev ? 'http://localhost:3000/?s=success' : 'http://localhost:3000/?s=success';


const generateCheckoutURL = (credits: number) => {
    const client = getClient();

    // Convert MXN to centavos (smallest currency unit for MXN)
    const amountInCents = credits === 10 ? 15000 : credits === 20 ? 28000 : 99900;
    
    return client.checkout.sessions.create({
        metadata: {
            credits
        },
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'mxn',
                product_data: {
                    name: `Paquete de créditos - ${credits} créditos`,
                    description: 'Paquete de créditos para generar videos',
                },
                unit_amount: amountInCents,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: success_url,
        cancel_url: success_url.replace('/?s=success', '/?s=cancel'),
    });
}

export const makeCheckoutUrls = async () => {
    const url1 = await generateCheckoutURL(10);
    const url2 = await generateCheckoutURL(20);
    const url3 = await generateCheckoutURL(100);
    return [url1, url2, url3]
}
