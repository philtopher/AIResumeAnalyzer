import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const CheckoutForm = ({ clientSecret, onSuccess, onError }: CheckoutFormProps) => {
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

    // Confirm payment with Stripe
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      {errorMessage && (
        <div className="text-red-500 text-sm">{errorMessage}</div>
      )}
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </Button>
    </form>
  );
};

interface StripeCheckoutProps {
  planType: 'standard' | 'pro';
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function StripeCheckout({ planType, onSuccess, onError }: StripeCheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/stripe/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            plan: planType,
          }),
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Could not create payment intent');
        }
        
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        onError(error instanceof Error ? error.message : 'Failed to setup payment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientSecret();
  }, [planType, onError]);

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
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Complete your subscription</h3>
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm 
          clientSecret={clientSecret} 
          onSuccess={onSuccess}
          onError={onError}
        />
      </Elements>
    </div>
  );
}