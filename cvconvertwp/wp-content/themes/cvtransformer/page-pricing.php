<?php
/**
 * Template Name: Pricing Page
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="page-header">
            <h1 class="page-title"><?php _e('Subscription Plans', 'cvtransformer'); ?></h1>
            <p class="page-description"><?php _e('Choose the plan that best suits your career needs', 'cvtransformer'); ?></p>
        </div>
        
        <div class="pricing-plans">
            <!-- Free Trial Card -->
            <div class="pricing-card">
                <div class="pricing-header">
                    <h3 class="pricing-name"><?php _e('Free Trial', 'cvtransformer'); ?></h3>
                    <div class="pricing-price">
                        <?php _e('30', 'cvtransformer'); ?>
                        <span class="pricing-interval"><?php _e('days', 'cvtransformer'); ?></span>
                    </div>
                </div>
                <div class="pricing-features">
                    <ul>
                        <li><?php _e('Limited CV transformation', 'cvtransformer'); ?></li>
                        <li><?php _e('Basic keyword optimization', 'cvtransformer'); ?></li>
                        <li><?php _e('Preview of Pro features', 'cvtransformer'); ?></li>
                    </ul>
                </div>
                <div class="pricing-action">
                    <?php if (!is_user_logged_in()) : ?>
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-secondary">
                            <?php _e('Start Free Trial', 'cvtransformer'); ?>
                        </a>
                    <?php else : ?>
                        <button disabled class="button button-disabled">
                            <?php _e('Already Registered', 'cvtransformer'); ?>
                        </button>
                    <?php endif; ?>
                </div>
            </div>
            
            <!-- Standard Plan Card -->
            <div class="pricing-card">
                <div class="pricing-header">
                    <h3 class="pricing-name"><?php _e('Standard Plan', 'cvtransformer'); ?></h3>
                    <div class="pricing-price">
                        £5
                        <span class="pricing-interval"><?php _e('/month', 'cvtransformer'); ?></span>
                    </div>
                </div>
                <div class="pricing-features">
                    <ul>
                        <li><?php _e('Unlimited CV transformations', 'cvtransformer'); ?></li>
                        <li><?php _e('Advanced keyword optimization', 'cvtransformer'); ?></li>
                        <li><?php _e('Detailed feedback and suggestions', 'cvtransformer'); ?></li>
                        <li><?php _e('CV score analysis', 'cvtransformer'); ?></li>
                        <li><?php _e('Transformation history', 'cvtransformer'); ?></li>
                    </ul>
                </div>
                <div class="pricing-action">
                    <?php 
                    if (is_user_logged_in()) {
                        $user_id = get_current_user_id();
                        $subscription_status = get_user_meta($user_id, '_subscription_status', true);
                        $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';
                        
                        if ($subscription_status === 'active' && !$is_pro) {
                            // Already on standard plan
                            ?>
                            <button disabled class="button button-disabled">
                                <?php _e('Current Plan', 'cvtransformer'); ?>
                            </button>
                            <?php
                        } elseif ($subscription_status === 'active' && $is_pro) {
                            // Pro user who might want to downgrade
                            ?>
                            <a href="<?php echo esc_url(add_query_arg('action', 'downgrade', home_url('/subscription-action/'))); ?>" class="button button-secondary">
                                <?php _e('Downgrade', 'cvtransformer'); ?>
                            </a>
                            <?php
                        } else {
                            // No active subscription, can subscribe
                            ?>
                            <a href="<?php echo esc_url(add_query_arg(array('plan' => 'standard'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                <?php _e('Subscribe Now', 'cvtransformer'); ?>
                            </a>
                            <?php
                        }
                    } else {
                        // Not logged in
                        ?>
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                            <?php _e('Register & Subscribe', 'cvtransformer'); ?>
                        </a>
                        <?php
                    }
                    ?>
                </div>
            </div>
            
            <!-- Pro Plan Card -->
            <div class="pricing-card featured">
                <div class="pricing-header">
                    <h3 class="pricing-name"><?php _e('Pro Plan', 'cvtransformer'); ?></h3>
                    <div class="pricing-price">
                        £15
                        <span class="pricing-interval"><?php _e('/month', 'cvtransformer'); ?></span>
                    </div>
                </div>
                <div class="pricing-features">
                    <ul>
                        <li><?php _e('All Standard plan features', 'cvtransformer'); ?></li>
                        <li><?php _e('Organization competition analysis', 'cvtransformer'); ?></li>
                        <li><?php _e('Interviewer background insights', 'cvtransformer'); ?></li>
                        <li><?php _e('Advanced scoring algorithms', 'cvtransformer'); ?></li>
                        <li><?php _e('Industry-specific optimizations', 'cvtransformer'); ?></li>
                        <li><?php _e('Priority support', 'cvtransformer'); ?></li>
                    </ul>
                </div>
                <div class="pricing-action">
                    <?php 
                    if (is_user_logged_in()) {
                        $user_id = get_current_user_id();
                        $subscription_status = get_user_meta($user_id, '_subscription_status', true);
                        $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';
                        
                        if ($subscription_status === 'active' && $is_pro) {
                            // Already on pro plan
                            ?>
                            <button disabled class="button button-disabled">
                                <?php _e('Current Plan', 'cvtransformer'); ?>
                            </button>
                            <?php
                        } elseif ($subscription_status === 'active' && !$is_pro) {
                            // Standard user who can upgrade
                            ?>
                            <a href="<?php echo esc_url(add_query_arg(array('plan' => 'pro', 'action' => 'upgrade'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                <?php _e('Upgrade to Pro', 'cvtransformer'); ?>
                            </a>
                            <?php
                        } else {
                            // No active subscription, can subscribe directly to pro
                            ?>
                            <a href="<?php echo esc_url(add_query_arg(array('plan' => 'pro'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                <?php _e('Get Pro Access', 'cvtransformer'); ?>
                            </a>
                            <?php
                        }
                    } else {
                        // Not logged in
                        ?>
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                            <?php _e('Register & Subscribe', 'cvtransformer'); ?>
                        </a>
                        <?php
                    }
                    ?>
                </div>
            </div>
        </div>
        
        <div class="pricing-faq">
            <h2><?php _e('Frequently Asked Questions', 'cvtransformer'); ?></h2>
            
            <div class="faq-item">
                <h3><?php _e('How does the billing work?', 'cvtransformer'); ?></h3>
                <p><?php _e('Your subscription will be billed monthly. You can cancel at any time, and your subscription will remain active until the end of the current billing period.', 'cvtransformer'); ?></p>
            </div>
            
            <div class="faq-item">
                <h3><?php _e('Can I upgrade or downgrade my plan?', 'cvtransformer'); ?></h3>
                <p><?php _e('Yes, you can upgrade from Standard to Pro at any time. When upgrading, you\'ll only pay the difference (£10). You can also downgrade from Pro to Standard, which will take effect at the end of your current billing period.', 'cvtransformer'); ?></p>
            </div>
            
            <div class="faq-item">
                <h3><?php _e('Is there a free trial?', 'cvtransformer'); ?></h3>
                <p><?php _e('Yes, all new users get a 30-day free trial with limited features. After the trial period, you\'ll need to subscribe to either the Standard or Pro plan to continue using the platform.', 'cvtransformer'); ?></p>
            </div>
            
            <div class="faq-item">
                <h3><?php _e('How secure is my payment information?', 'cvtransformer'); ?></h3>
                <p><?php _e('All payments are processed securely through Stripe. We never store your card details on our servers.', 'cvtransformer'); ?></p>
            </div>
        </div>
    </div>
</main>

<style>
/* Pricing page specific styles */
.pricing-plans {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
}

@media (min-width: 768px) {
    .pricing-plans {
        grid-template-columns: repeat(3, 1fr);
    }
}

.pricing-faq {
    margin-top: 4rem;
}

.faq-item {
    margin-bottom: 2rem;
}

.faq-item h3 {
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
}

.button-disabled {
    background-color: #e5e7eb;
    color: #6b7280;
    cursor: not-allowed;
}
</style>

<?php
get_footer();
?>
