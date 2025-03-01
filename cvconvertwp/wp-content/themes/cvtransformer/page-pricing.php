<?php
/**
 * Template Name: Pricing Page
 *
 * @package CVTransformer
 */

get_header();

// Get pricing from customizer settings
$standard_price = get_theme_mod('standard_plan_price', 5);
$pro_price = get_theme_mod('pro_plan_price', 15);
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
                        £<?php echo esc_html($standard_price); ?>
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

                        // Check if user has access using our compatibility function
                        $has_access = cvtransformer_check_premium_access('cv_transform', $user_id);
                        $has_pro = cvtransformer_check_premium_access('pro_features', $user_id);

                        // Check if myCred points can be used
                        $can_use_points = false;
                        $points_required = 0;

                        if (get_theme_mod('mycred_enable', '0') && function_exists('mycred_get_users_balance')) {
                            $points_required = cvtransformer_get_mycred_feature_cost('cv_transform');
                            if ($points_required > 0) {
                                $balance = mycred_get_users_balance($user_id);
                                $can_use_points = ($balance >= $points_required);
                            }
                        }

                        if ($has_access && !$has_pro) {
                            // Already on standard plan
                            ?>
                            <button disabled class="button button-disabled">
                                <?php _e('Current Plan', 'cvtransformer'); ?>
                            </button>
                            <?php
                        } elseif ($has_access && $has_pro) {
                            // Pro user who might want to downgrade
                            if (function_exists('pmpro_hasMembershipLevel')) {
                                // Using Paid Membership Pro
                                $pmpro_levels_url = pmpro_url('levels');
                                ?>
                                <a href="<?php echo esc_url($pmpro_levels_url); ?>" class="button button-secondary">
                                    <?php _e('Change Plan', 'cvtransformer'); ?>
                                </a>
                                <?php
                            } else {
                                // Using built-in subscription system
                                ?>
                                <a href="<?php echo esc_url(add_query_arg('action', 'downgrade', home_url('/subscription-action/'))); ?>" class="button button-secondary">
                                    <?php _e('Downgrade', 'cvtransformer'); ?>
                                </a>
                                <?php
                            }
                        } elseif ($can_use_points) {
                            // Can use myCred points instead of subscribing
                            ?>
                            <a href="<?php echo esc_url(add_query_arg(['use_points' => 'cv_transform'], home_url('/use-points/'))); ?>" class="button button-primary">
                                <?php printf(__('Use %d Points', 'cvtransformer'), $points_required); ?>
                            </a>
                            <?php
                        } else {
                            // No active subscription, can subscribe
                            if (function_exists('pmpro_hasMembershipLevel')) {
                                // Using Paid Membership Pro
                                // Get standard levels from our compatibility function
                                $standard_levels = cvtransformer_get_pmpro_levels(false);
                                if (!empty($standard_levels)) {
                                    $level_id = $standard_levels[0]; // Use first level as default
                                    $checkout_url = pmpro_url('checkout', '?level=' . $level_id);
                                    ?>
                                    <a href="<?php echo esc_url($checkout_url); ?>" class="button button-primary">
                                        <?php _e('Subscribe Now', 'cvtransformer'); ?>
                                    </a>
                                    <?php
                                } else {
                                    // Fallback to levels page if no specific level is configured
                                    ?>
                                    <a href="<?php echo esc_url(pmpro_url('levels')); ?>" class="button button-primary">
                                        <?php _e('View Plans', 'cvtransformer'); ?>
                                    </a>
                                    <?php
                                }
                            } else {
                                // Using built-in subscription system
                                ?>
                                <a href="<?php echo esc_url(add_query_arg(array('plan' => 'standard'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                    <?php _e('Subscribe Now', 'cvtransformer'); ?>
                                </a>
                                <?php
                            }
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
                        £<?php echo esc_html($pro_price); ?>
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

                        // Check if user has access using our compatibility function
                        $has_access = cvtransformer_check_premium_access('cv_transform', $user_id);
                        $has_pro = cvtransformer_check_premium_access('pro_features', $user_id);

                        // Check if myCred points can be used
                        $can_use_points = false;
                        $points_required = 0;

                        if (get_theme_mod('mycred_enable', '0') && function_exists('mycred_get_users_balance')) {
                            $points_required = cvtransformer_get_mycred_feature_cost('pro_features');
                            if ($points_required > 0) {
                                $balance = mycred_get_users_balance($user_id);
                                $can_use_points = ($balance >= $points_required);
                            }
                        }

                        if ($has_access && $has_pro) {
                            // Already on pro plan
                            ?>
                            <button disabled class="button button-disabled">
                                <?php _e('Current Plan', 'cvtransformer'); ?>
                            </button>
                            <?php
                        } elseif ($has_access && !$has_pro) {
                            // Standard user who can upgrade
                            if (function_exists('pmpro_hasMembershipLevel')) {
                                // Using Paid Membership Pro
                                $pmpro_levels_url = pmpro_url('levels');
                                ?>
                                <a href="<?php echo esc_url($pmpro_levels_url); ?>" class="button button-primary">
                                    <?php _e('Upgrade to Pro', 'cvtransformer'); ?>
                                </a>
                                <?php
                            } else {
                                // Using built-in subscription system
                                ?>
                                <a href="<?php echo esc_url(add_query_arg(array('plan' => 'pro', 'action' => 'upgrade'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                    <?php _e('Upgrade to Pro', 'cvtransformer'); ?>
                                </a>
                                <?php
                            }
                        } elseif ($can_use_points) {
                            // Can use myCred points instead of subscribing
                            ?>
                            <a href="<?php echo esc_url(add_query_arg(['use_points' => 'pro_features'], home_url('/use-points/'))); ?>" class="button button-primary">
                                <?php printf(__('Use %d Points', 'cvtransformer'), $points_required); ?>
                            </a>
                            <?php
                        } else {
                            // No active subscription, can subscribe directly to pro
                            if (function_exists('pmpro_hasMembershipLevel')) {
                                // Using Paid Membership Pro
                                // Get pro levels from our compatibility function
                                $pro_levels = cvtransformer_get_pmpro_levels(true);
                                if (!empty($pro_levels)) {
                                    $level_id = $pro_levels[0]; // Use first level as default
                                    $checkout_url = pmpro_url('checkout', '?level=' . $level_id);
                                    ?>
                                    <a href="<?php echo esc_url($checkout_url); ?>" class="button button-primary">
                                        <?php _e('Get Pro Access', 'cvtransformer'); ?>
                                    </a>
                                    <?php
                                } else {
                                    // Fallback to levels page if no specific level is configured
                                    ?>
                                    <a href="<?php echo esc_url(pmpro_url('levels')); ?>" class="button button-primary">
                                        <?php _e('View Plans', 'cvtransformer'); ?>
                                    </a>
                                    <?php
                                }
                            } else {
                                // Using built-in subscription system
                                ?>
                                <a href="<?php echo esc_url(add_query_arg(array('plan' => 'pro'), home_url('/subscribe/'))); ?>" class="button button-primary">
                                    <?php _e('Get Pro Access', 'cvtransformer'); ?>
                                </a>
                                <?php
                            }
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
                <p><?php 
                    printf(
                        __('Yes, you can upgrade from Standard to Pro at any time. When upgrading, you\'ll only pay the difference (£%1$s). You can also downgrade from Pro to Standard, which will take effect at the end of your current billing period.', 'cvtransformer'),
                        esc_html($pro_price - $standard_price)
                    ); 
                ?></p>
            </div>

            <div class="faq-item">
                <h3><?php _e('Is there a free trial?', 'cvtransformer'); ?></h3>
                <p><?php _e('Yes, all new users get a 30-day free trial with limited features. After the trial period, you\'ll need to subscribe to either the Standard or Pro plan to continue using the platform.', 'cvtransformer'); ?></p>
            </div>

            <div class="faq-item">
                <h3><?php _e('How secure is my payment information?', 'cvtransformer'); ?></h3>
                <p><?php _e('All payments are processed securely through Stripe. We never store your card details on our servers.', 'cvtransformer'); ?></p>
            </div>

            <?php if (get_theme_mod('mycred_enable', '0') && function_exists('mycred_get_users_balance')) : ?>
            <div class="faq-item">
                <h3><?php _e('Can I use my points instead of subscribing?', 'cvtransformer'); ?></h3>
                <p>
                    <?php 
                    $transform_points = cvtransformer_get_mycred_feature_cost('cv_transform');
                    $pro_points = cvtransformer_get_mycred_feature_cost('pro_features');

                    if ($transform_points > 0 || $pro_points > 0) {
                        printf(
                            __('Yes, you can use your points for individual features instead of subscribing. CV transformation costs %1$s points, and Pro features cost %2$s points per use.', 'cvtransformer'),
                            $transform_points,
                            $pro_points
                        );
                    } else {
                        _e('Points can be used for certain features. See your account page for details on available point-based features.', 'cvtransformer');
                    }
                    ?>
                </p>
                <?php if (is_user_logged_in() && function_exists('mycred_get_users_balance')) : ?>
                    <p>
                        <?php 
                        $balance = mycred_get_users_balance(get_current_user_id());
                        printf(
                            __('Your current balance: %s points', 'cvtransformer'),
                            $balance
                        );
                        ?>
                    </p>
                <?php endif; ?>
            </div>
            <?php endif; ?>
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