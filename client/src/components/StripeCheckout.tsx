import React, { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY, {
  apiVersion: '2023-10-16', // Latest version as of implementation
});

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  planType: 'basic' | 'standard' | 'pro';
  isRegistration?: boolean;
}

const CheckoutForm = ({ clientSecret, onSuccess, onError, planType, isRegistration }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    // Determine return URL based on flow (registration vs subscription upgrade)
    const returnUrl = isRegistration 
      ? window.location.origin + '/registration-complete'
      : window.location.origin + '/payment-success';

    // Confirm payment with Stripe
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message);
      onError(error.message || 'An error occurred with your payment');
    } else {
      onSuccess();
    }

    setIsProcessing(false);
  };

  // Display the appropriate amount based on plan type
  const planAmount = planType === 'pro' 
    ? '£30' 
    : planType === 'standard' 
      ? '£5' 
      : '£3';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="mb-4" />
      
      {errorMessage && (
        <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full bg-primary hover:bg-primary/90 text-white"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay {planAmount} Now</>
        )}
      </Button>
    </form>
  );
};

interface RegistrationData {
  username: string;
  email: string;
  password: string;
}

interface StripeCheckoutProps {
  planType: 'basic' | 'standard' | 'pro';
  onSuccess: () => void;
  onError: (message: string) => void;
  isRegistration?: boolean;
  userId?: number; // For existing users
  registrationData?: RegistrationData; // For new registrations
}

export default function StripeCheckout({ planType, onSuccess, onError, isRegistration = false, userId, registrationData }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        setIsLoading(true);
        
        // Determine which endpoint to use based on whether this is registration or normal subscription
        const endpoint = isRegistration 
          ? '/api/direct-subscription/direct-subscription'
          : '/api/stripe/create-payment-intent';
        
        // Create the appropriate request body based on the endpoint and available data
        let body;
        
        if (isRegistration && registrationData) {
          body = { 
            plan: planType, 
            registrationData // For direct subscription with registration
          };
        } else if (!isRegistration && userId) {
          body = { 
            plan: planType,
            userId // For existing users upgrading
          };
        } else {
          body = { plan: planType };
        }
          
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Could not create payment session');
        }
        
        // Handle different responses from the two endpoints
        if (isRegistration && data.url) {
          // For registration, we get a checkout URL to redirect to
          window.location.href = data.url;
          return;
        } else {
          // For normal subscription, we get a client secret for Stripe Elements
          setClientSecret(data.clientSecret);
        }
      } catch (error) {
        console.error('Error setting up payment:', error);
        onError(error instanceof Error ? error.message : 'Failed to setup payment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientSecret();
  }, [planType, onError, isRegistration, userId, registrationData]);

  if (isLoading || !clientSecret) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
    payment_method_types: ['card', 'apple_pay', 'google_pay'],
    wallets: {
      applePay: 'auto',
      googlePay: 'auto'
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">
        {isRegistration 
          ? 'Complete Your Registration' 
          : `Upgrade to ${planType === 'pro' 
              ? 'Pro' 
              : planType === 'standard' ? 'Standard' : 'Basic'} Subscription Plan`}
      </h3>
      
      <div className="mb-6">
        <div className="flex justify-center items-center mb-4">
          <div className="text-sm text-gray-600 mr-3">Pay with</div>
          <div className="flex space-x-6 items-center">
            <div className="flex flex-col items-center">
              <img 
                src="/attached_assets/apple-pay2.png" 
                alt="Apple Pay" 
                className="h-8 w-auto object-contain"
              />
              <span className="text-xs text-gray-500 mt-1">Apple Pay</span>
            </div>
            <div className="flex flex-col items-center">
              <img 
                src="/attached_assets/google-pay.png" 
                alt="Google Pay" 
                className="h-8 w-auto object-contain"
              />
              <span className="text-xs text-gray-500 mt-1">Google Pay</span>
            </div>
          </div>
        </div>
        <div className="flex items-center my-4">
          <Separator className="flex-grow" />
          <span className="px-2 text-xs text-gray-500">OR PAY WITH CARD</span>
          <Separator className="flex-grow" />
        </div>
      </div>
      
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          clientSecret={clientSecret} 
          onSuccess={onSuccess}
          onError={onError}
          planType={planType}
          isRegistration={isRegistration}
        />
      </Elements>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        <p className="font-medium">Your payment is secure and encrypted.</p>
        <p className="mt-1">
          {planType === 'pro' 
            ? 'Pro Subscription Plan: £30/month for unlimited transformations and advanced tools' 
            : planType === 'standard'
              ? 'Standard Subscription Plan: £5/month for 20 transformations per month'
              : 'Basic Subscription Plan: £3/month for 10 transformations per month'}
        </p>
        <p className="mt-1">You can cancel your subscription anytime from your account settings.</p>
      </div>
    </div>
  );
}