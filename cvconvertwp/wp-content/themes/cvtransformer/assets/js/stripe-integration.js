/**
 * Stripe integration for CV Transformer theme
 * Handles payment processing for subscriptions
 */

(function($) {
    'use strict';
    
    // Initialize Stripe client
    const stripe = Stripe(stripe_params.publishable_key);
    
    /**
     * Payment Buttons Handler
     */
    const PaymentHandler = {
        init: function() {
            // Subscribe/Upgrade buttons
            $('.subscribe-button, .upgrade-button').on('click', function(e) {
                e.preventDefault();
                
                const $button = $(this);
                const planId = $button.data('plan-id');
                const actionType = $button.hasClass('upgrade-button') ? 'upgrade' : 'subscribe';
                
                if (!planId) {
                    alert('Invalid plan selection.');
                    return;
                }
                
                $button.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
                
                // Create payment link via AJAX
                $.ajax({
                    url: cvtransformer_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_create_payment_link',
                        nonce: cvtransformer_params.nonce,
                        plan_id: planId,
                        action_type: actionType
                    },
                    success: function(response) {
                        if (response.success && response.data.url) {
                            window.location.href = response.data.url;
                        } else {
                            alert(response.data || 'Failed to create payment link.');
                        }
                    },
                    error: function() {
                        alert('A server error occurred. Please try again later.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).html($button.data('original-text') || 'Subscribe');
                    }
                });
            });
            
            // Downgrade button
            $('#downgrade-to-standard').on('click', function(e) {
                e.preventDefault();
                
                if (!confirm('Are you sure you want to downgrade to the Standard plan? You will lose access to Pro features at the end of your current billing period.')) {
                    return;
                }
                
                const $button = $(this);
                
                $button.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
                
                $.ajax({
                    url: cvtransformer_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_downgrade_subscription',
                        nonce: cvtransformer_params.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Successfully downgraded to Standard plan. Changes will take effect at the end of your current billing period.');
                            window.location.reload();
                        } else {
                            alert(response.data || 'Failed to downgrade subscription.');
                        }
                    },
                    error: function() {
                        alert('A server error occurred. Please try again later.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).html('Downgrade to Standard');
                    }
                });
            });
        },
    };
    
    /**
     * Payment Success Handler
     */
    const PaymentSuccessHandler = {
        init: function() {
            if ($('.payment-success-page').length) {
                this.verifyPayment();
            }
        },
        
        verifyPayment: function() {
            // Get session ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const sessionId = urlParams.get('session_id');
            
            if (!sessionId) {
                this.showError('No session ID found');
                return;
            }
            
            $('.payment-status').html('<div class="loading"><i class="fas fa-circle-notch fa-spin"></i> Verifying payment...</div>');
            
            // Verify payment via AJAX
            $.ajax({
                url: cvtransformer_params.ajax_url,
                type: 'POST',
                data: {
                    action: 'cvtransformer_verify_payment',
                    nonce: cvtransformer_params.nonce,
                    session_id: sessionId
                },
                success: function(response) {
                    if (response.success) {
                        PaymentSuccessHandler.showSuccess(response.data);
                    } else {
                        PaymentSuccessHandler.showError(response.data || 'Payment verification failed');
                    }
                },
                error: function() {
                    PaymentSuccessHandler.showError('A server error occurred. Please try again later.');
                }
            });
        },
        
        showSuccess: function(data) {
            const isPro = data.is_pro;
            const planName = isPro ? 'Pro' : 'Standard';
            
            $('.payment-status').html(`
                <div class="payment-success">
                    <div class="success-icon"><i class="fas fa-check-circle"></i></div>
                    <h2>Welcome to CV Transformer ${planName}!</h2>
                    <p>Your subscription has been successfully activated.</p>
                    <div class="button-group">
                        <a href="${cvtransformer_params.home_url}/account/" class="button button-primary">Go to Account</a>
                        <a href="${cvtransformer_params.home_url}/cv-transform/" class="button button-secondary">Transform Your CV</a>
                    </div>
                </div>
            `);
        },
        
        showError: function(errorMessage) {
            $('.payment-status').html(`
                <div class="payment-error">
                    <div class="error-icon"><i class="fas fa-exclamation-circle"></i></div>
                    <h2>Payment Verification Failed</h2>
                    <p>${errorMessage}</p>
                    <a href="${cvtransformer_params.home_url}/pricing/" class="button button-primary">Try Again</a>
                </div>
            `);
        }
    };
    
    /**
     * Initialize on document ready
     */
    $(document).ready(function() {
        PaymentHandler.init();
        PaymentSuccessHandler.init();
        
        // Save original button text for restoration after loading
        $('.subscribe-button, .upgrade-button').each(function() {
            $(this).data('original-text', $(this).text());
        });
    });
    
})(jQuery);
