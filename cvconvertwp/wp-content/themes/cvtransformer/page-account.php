<?php
/**
 * Template Name: Account Page
 *
 * @package CVTransformer
 */

// Redirect non-logged in users to login page
if (!is_user_logged_in()) {
    wp_redirect(home_url('/login/'));
    exit;
}

$user_id = get_current_user_id();
$user = get_userdata($user_id);

// Get subscription information using our compatibility function
$has_access = cvtransformer_check_premium_access('cv_transform');
$has_pro_access = cvtransformer_check_premium_access('pro_features');

// Check which membership system is active
$using_pmpro = function_exists('pmpro_hasMembershipLevel');
$using_mycred = get_theme_mod('mycred_enable', '0') && function_exists('mycred_get_users_balance');

// Get subscription details based on active system
if ($using_pmpro) {
    // Get data from Paid Membership Pro
    $current_level = pmpro_getMembershipLevelForUser($user_id);
    $subscription_status = !empty($current_level) ? 'active' : '';
    $is_pro = !empty($current_level) && in_array($current_level->id, cvtransformer_get_pmpro_levels(true));
    $subscription_expiry = !empty($current_level) ? $current_level->enddate : '';
} else {
    // Use built-in subscription system
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';
    $subscription_expiry = get_user_meta($user_id, '_subscription_expiry', true);
}

// Get trial information
$trial_started_at = get_user_meta($user_id, '_trial_started_at', true);
$trial_active = false;
$trial_days_remaining = 0;

if ($trial_started_at && $subscription_status !== 'active') {
    $trial_end_date = strtotime($trial_started_at . ' + 30 days');
    $trial_active = time() < $trial_end_date;

    if ($trial_active) {
        $trial_days_remaining = max(0, ceil(($trial_end_date - time()) / (60 * 60 * 24)));
    }
}

// Get myCred points balance if available
$mycred_balance = $using_mycred ? mycred_get_users_balance($user_id) : 0;

// Get user's CV transformations
$transformations = get_posts([
    'post_type' => 'cv_transformation',
    'posts_per_page' => 10,
    'meta_query' => [
        [
            'key' => '_user_id',
            'value' => $user_id,
            'compare' => '=',
        ],
    ],
]);

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="page-header">
            <h1 class="page-title"><?php _e('My Account', 'cvtransformer'); ?></h1>
        </div>

        <div class="account-container">
            <div class="account-nav">
                <ul class="nav-tabs">
                    <li class="active"><a href="#profile" data-toggle="tab"><?php _e('Profile', 'cvtransformer'); ?></a></li>
                    <li><a href="#subscription" data-toggle="tab"><?php _e('Subscription', 'cvtransformer'); ?></a></li>
                    <li><a href="#history" data-toggle="tab"><?php _e('CV History', 'cvtransformer'); ?></a></li>
                    <?php if ($using_mycred): ?>
                    <li><a href="#points" data-toggle="tab"><?php _e('Points', 'cvtransformer'); ?></a></li>
                    <?php endif; ?>
                </ul>
            </div>

            <div class="account-content">
                <div class="tab-content">
                    <!-- Profile Tab -->
                    <div id="profile" class="tab-pane active">
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title"><?php _e('Profile Information', 'cvtransformer'); ?></h2>
                            </div>
                            <div class="card-content">
                                <form id="profile-form" class="account-form">
                                    <div class="form-group">
                                        <label for="username" class="form-label"><?php _e('Username', 'cvtransformer'); ?></label>
                                        <input type="text" id="username" name="username" class="form-control" value="<?php echo esc_attr($user->user_login); ?>" readonly>
                                    </div>

                                    <div class="form-group">
                                        <label for="email" class="form-label"><?php _e('Email', 'cvtransformer'); ?></label>
                                        <input type="email" id="email" name="email" class="form-control" value="<?php echo esc_attr($user->user_email); ?>" readonly>
                                    </div>

                                    <div class="form-group">
                                        <label for="first-name" class="form-label"><?php _e('First Name', 'cvtransformer'); ?></label>
                                        <input type="text" id="first-name" name="first_name" class="form-control" value="<?php echo esc_attr($user->first_name); ?>">
                                    </div>

                                    <div class="form-group">
                                        <label for="last-name" class="form-label"><?php _e('Last Name', 'cvtransformer'); ?></label>
                                        <input type="text" id="last-name" name="last_name" class="form-control" value="<?php echo esc_attr($user->last_name); ?>">
                                    </div>

                                    <div class="form-actions">
                                        <button type="submit" class="button button-primary"><?php _e('Update Profile', 'cvtransformer'); ?></button>
                                    </div>

                                    <?php wp_nonce_field('update_profile', 'profile_nonce'); ?>
                                </form>

                                <hr>

                                <form id="password-form" class="account-form">
                                    <h3><?php _e('Change Password', 'cvtransformer'); ?></h3>

                                    <div class="form-group">
                                        <label for="current-password" class="form-label"><?php _e('Current Password', 'cvtransformer'); ?></label>
                                        <input type="password" id="current-password" name="current_password" class="form-control" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="new-password" class="form-label"><?php _e('New Password', 'cvtransformer'); ?></label>
                                        <input type="password" id="new-password" name="new_password" class="form-control" required>
                                    </div>

                                    <div class="form-group">
                                        <label for="confirm-password" class="form-label"><?php _e('Confirm New Password', 'cvtransformer'); ?></label>
                                        <input type="password" id="confirm-password" name="confirm_password" class="form-control" required>
                                    </div>

                                    <div class="form-actions">
                                        <button type="submit" class="button button-primary"><?php _e('Change Password', 'cvtransformer'); ?></button>
                                    </div>

                                    <?php wp_nonce_field('change_password', 'password_nonce'); ?>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Subscription Tab -->
                    <div id="subscription" class="tab-pane">
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title"><?php _e('Subscription Details', 'cvtransformer'); ?></h2>
                            </div>
                            <div class="card-content">
                                <?php if ($using_pmpro && !empty($current_level)): ?>
                                    <!-- Paid Membership Pro active subscription -->
                                    <div class="subscription-status subscription-active">
                                        <i class="fas fa-check-circle"></i>
                                        <h3><?php echo esc_html($current_level->name); ?></h3>
                                        <p><?php _e('Your membership is active.', 'cvtransformer'); ?></p>
                                        <?php if (!empty($current_level->enddate)): ?>
                                            <p><?php printf(__('Expiration date: %s', 'cvtransformer'), date_i18n(get_option('date_format'), $current_level->enddate)); ?></p>
                                        <?php endif; ?>
                                    </div>

                                    <div class="subscription-features">
                                        <h4><?php _e('Your Plan Includes:', 'cvtransformer'); ?></h4>
                                        <ul>
                                            <li><i class="fas fa-check"></i> <?php _e('CV transformation with AI optimization', 'cvtransformer'); ?></li>
                                            <li><i class="fas fa-check"></i> <?php _e('Keyword matching and suggestions', 'cvtransformer'); ?></li>
                                            <?php if ($has_pro_access): ?>
                                                <li><i class="fas fa-check"></i> <?php _e('Organization insights and analysis', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Interviewer background information', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Advanced CV scoring', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Priority support', 'cvtransformer'); ?></li>
                                            <?php endif; ?>
                                        </ul>
                                    </div>

                                    <div class="subscription-actions">
                                        <a href="<?php echo esc_url(pmpro_url('account')); ?>" class="button button-primary"><?php _e('Manage Membership', 'cvtransformer'); ?></a>
                                        <a href="<?php echo esc_url(pmpro_url('levels')); ?>" class="button button-secondary"><?php _e('View Available Plans', 'cvtransformer'); ?></a>
                                    </div>

                                <?php elseif ($subscription_status === 'active'): ?>
                                    <!-- Built-in subscription system active subscription -->
                                    <div class="subscription-status subscription-active">
                                        <i class="fas fa-check-circle"></i>
                                        <h3><?php echo $is_pro ? __('Pro Plan', 'cvtransformer') : __('Standard Plan', 'cvtransformer'); ?></h3>
                                        <p><?php _e('Your subscription is active.', 'cvtransformer'); ?></p>
                                        <?php if ($subscription_expiry): ?>
                                            <p><?php printf(__('Next billing date: %s', 'cvtransformer'), date_i18n(get_option('date_format'), strtotime($subscription_expiry))); ?></p>
                                        <?php endif; ?>
                                    </div>

                                    <div class="subscription-features">
                                        <h4><?php _e('Your Plan Includes:', 'cvtransformer'); ?></h4>
                                        <ul>
                                            <li><i class="fas fa-check"></i> <?php _e('CV transformation with AI optimization', 'cvtransformer'); ?></li>
                                            <li><i class="fas fa-check"></i> <?php _e('Keyword matching and suggestions', 'cvtransformer'); ?></li>
                                            <?php if ($is_pro): ?>
                                                <li><i class="fas fa-check"></i> <?php _e('Organization insights and analysis', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Interviewer background information', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Advanced CV scoring', 'cvtransformer'); ?></li>
                                                <li><i class="fas fa-check"></i> <?php _e('Priority support', 'cvtransformer'); ?></li>
                                            <?php endif; ?>
                                        </ul>
                                    </div>

                                    <div class="subscription-actions">
                                        <?php if ($is_pro): ?>
                                            <button id="downgrade-button" class="button button-secondary"><?php _e('Downgrade to Standard Plan (£5/month)', 'cvtransformer'); ?></button>
                                        <?php else: ?>
                                            <button id="upgrade-button" class="button button-primary"><?php _e('Upgrade to Pro Plan (£15/month)', 'cvtransformer'); ?></button>
                                        <?php endif; ?>

                                        <button id="cancel-button" class="button button-link-delete"><?php _e('Cancel Subscription', 'cvtransformer'); ?></button>
                                    </div>
                                <?php elseif ($trial_active): ?>
                                    <!-- Trial period -->
                                    <div class="subscription-status subscription-trial">
                                        <i class="fas fa-hourglass-half"></i>
                                        <h3><?php _e('Trial Period', 'cvtransformer'); ?></h3>
                                        <p><?php printf(__('You have %d days remaining in your trial.', 'cvtransformer'), $trial_days_remaining); ?></p>
                                    </div>

                                    <div class="subscription-features">
                                        <h4><?php _e('Your Trial Includes:', 'cvtransformer'); ?></h4>
                                        <ul>
                                            <li><i class="fas fa-check"></i> <?php _e('CV transformation with AI optimization', 'cvtransformer'); ?></li>
                                            <li><i class="fas fa-check"></i> <?php _e('Keyword matching and suggestions', 'cvtransformer'); ?></li>
                                        </ul>
                                    </div>

                                    <div class="subscription-actions">
                                        <?php if ($using_pmpro): ?>
                                            <a href="<?php echo esc_url(pmpro_url('levels')); ?>" class="button button-primary"><?php _e('Choose a Plan', 'cvtransformer'); ?></a>
                                        <?php else: ?>
                                            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button button-primary"><?php _e('Subscribe Now', 'cvtransformer'); ?></a>
                                        <?php endif; ?>
                                    </div>
                                <?php else: ?>
                                    <!-- No active subscription -->
                                    <div class="subscription-status subscription-inactive">
                                        <i class="fas fa-times-circle"></i>
                                        <h3><?php _e('No Active Subscription', 'cvtransformer'); ?></h3>
                                        <p><?php _e('You currently do not have an active subscription.', 'cvtransformer'); ?></p>
                                    </div>

                                    <div class="subscription-actions">
                                        <?php if ($using_pmpro): ?>
                                            <a href="<?php echo esc_url(pmpro_url('levels')); ?>" class="button button-primary"><?php _e('Choose a Plan', 'cvtransformer'); ?></a>
                                        <?php else: ?>
                                            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button button-primary"><?php _e('Subscribe Now', 'cvtransformer'); ?></a>
                                        <?php endif; ?>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <!-- CV History Tab -->
                    <div id="history" class="tab-pane">
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title"><?php _e('CV Transformation History', 'cvtransformer'); ?></h2>
                            </div>
                            <div class="card-content">
                                <?php if (!empty($transformations)): ?>
                                    <div class="transformation-list">
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th><?php _e('Date', 'cvtransformer'); ?></th>
                                                    <th><?php _e('Target Role', 'cvtransformer'); ?></th>
                                                    <th><?php _e('Score', 'cvtransformer'); ?></th>
                                                    <th><?php _e('Actions', 'cvtransformer'); ?></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($transformations as $transformation): ?>
                                                    <?php 
                                                    $target_role = get_post_meta($transformation->ID, '_target_role', true);
                                                    $score = get_post_meta($transformation->ID, '_score', true);
                                                    ?>
                                                    <tr>
                                                        <td><?php echo date_i18n(get_option('date_format'), strtotime($transformation->post_date)); ?></td>
                                                        <td><?php echo esc_html($target_role); ?></td>
                                                        <td><?php echo esc_html($score); ?>%</td>
                                                        <td>
                                                            <a href="#" class="view-cv" data-id="<?php echo $transformation->ID; ?>"><?php _e('View', 'cvtransformer'); ?></a> | 
                                                            <a href="#" class="download-cv" data-id="<?php echo $transformation->ID; ?>"><?php _e('Download', 'cvtransformer'); ?></a>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                <?php else: ?>
                                    <div class="no-data-message">
                                        <p><?php _e('You have not transformed any CVs yet.', 'cvtransformer'); ?></p>
                                        <a href="<?php echo esc_url(home_url('/cv-transform/')); ?>" class="button button-primary"><?php _e('Transform Your CV', 'cvtransformer'); ?></a>
                                    </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <?php if ($using_mycred): ?>
                    <!-- Points Tab (myCred integration) -->
                    <div id="points" class="tab-pane">
                        <div class="card">
                            <div class="card-header">
                                <h2 class="card-title"><?php _e('My Points', 'cvtransformer'); ?></h2>
                            </div>
                            <div class="card-content">
                                <div class="points-balance">
                                    <h3><?php _e('Current Balance', 'cvtransformer'); ?></h3>
                                    <div class="points-display">
                                        <span class="points-value"><?php echo number_format($mycred_balance); ?></span>
                                        <span class="points-label"><?php echo mycred_get_point_type_name(mycred_get_point_type_key()); ?></span>
                                    </div>
                                </div>

                                <div class="points-features">
                                    <h3><?php _e('Use Points For:', 'cvtransformer'); ?></h3>
                                    <ul class="points-feature-list">
                                        <?php
                                        $cv_transform_cost = cvtransformer_get_mycred_feature_cost('cv_transform');
                                        $org_analysis_cost = cvtransformer_get_mycred_feature_cost('organization_analysis');
                                        $interviewer_analysis_cost = cvtransformer_get_mycred_feature_cost('interviewer_analysis');

                                        if ($cv_transform_cost > 0): ?>
                                            <li>
                                                <div class="feature-info">
                                                    <span class="feature-name"><?php _e('CV Transformation', 'cvtransformer'); ?></span>
                                                    <span class="feature-cost"><?php echo number_format($cv_transform_cost); ?> <?php _e('points', 'cvtransformer'); ?></span>
                                                </div>
                                                <?php if ($mycred_balance >= $cv_transform_cost): ?>
                                                    <a href="<?php echo esc_url(add_query_arg(['use_points' => 'cv_transform'], home_url('/use-points/'))); ?>" class="button button-small"><?php _e('Use Points', 'cvtransformer'); ?></a>
                                                <?php else: ?>
                                                    <span class="insufficient-points"><?php _e('Insufficient points', 'cvtransformer'); ?></span>
                                                <?php endif; ?>
                                            </li>
                                        <?php endif; ?>

                                        <?php if ($org_analysis_cost > 0): ?>
                                            <li>
                                                <div class="feature-info">
                                                    <span class="feature-name"><?php _e('Organization Analysis', 'cvtransformer'); ?></span>
                                                    <span class="feature-cost"><?php echo number_format($org_analysis_cost); ?> <?php _e('points', 'cvtransformer'); ?></span>
                                                </div>
                                                <?php if ($mycred_balance >= $org_analysis_cost): ?>
                                                    <a href="<?php echo esc_url(add_query_arg(['use_points' => 'organization_analysis'], home_url('/use-points/'))); ?>" class="button button-small"><?php _e('Use Points', 'cvtransformer'); ?></a>
                                                <?php else: ?>
                                                    <span class="insufficient-points"><?php _e('Insufficient points', 'cvtransformer'); ?></span>
                                                <?php endif; ?>
                                            </li>
                                        <?php endif; ?>

                                        <?php if ($interviewer_analysis_cost > 0): ?>
                                            <li>
                                                <div class="feature-info">
                                                    <span class="feature-name"><?php _e('Interviewer Analysis', 'cvtransformer'); ?></span>
                                                    <span class="feature-cost"><?php echo number_format($interviewer_analysis_cost); ?> <?php _e('points', 'cvtransformer'); ?></span>
                                                </div>
                                                <?php if ($mycred_balance >= $interviewer_analysis_cost): ?>
                                                    <a href="<?php echo esc_url(add_query_arg(['use_points' => 'interviewer_analysis'], home_url('/use-points/'))); ?>" class="button button-small"><?php _e('Use Points', 'cvtransformer'); ?></a>
                                                <?php else: ?>
                                                    <span class="insufficient-points"><?php _e('Insufficient points', 'cvtransformer'); ?></span>
                                                <?php endif; ?>
                                            </li>
                                        <?php endif; ?>
                                    </ul>
                                </div>

                                <?php if (function_exists('mycred_get_users_history')): ?>
                                <div class="points-history">
                                    <h3><?php _e('Recent Points History', 'cvtransformer'); ?></h3>
                                    <?php 
                                    $history = mycred_get_users_history($user_id, 'all', 10);
                                    if (!empty($history)): 
                                    ?>
                                        <table class="data-table">
                                            <thead>
                                                <tr>
                                                    <th><?php _e('Date', 'cvtransformer'); ?></th>
                                                    <th><?php _e('Description', 'cvtransformer'); ?></th>
                                                    <th><?php _e('Amount', 'cvtransformer'); ?></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach ($history as $entry): ?>
                                                    <tr>
                                                        <td><?php echo date_i18n(get_option('date_format'), $entry->time); ?></td>
                                                        <td><?php echo $entry->entry; ?></td>
                                                        <td class="<?php echo ($entry->creds > 0) ? 'positive' : 'negative'; ?>">
                                                            <?php echo mycred_format_creds($entry->creds); ?>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    <?php else: ?>
                                        <p><?php _e('No points history available.', 'cvtransformer'); ?></p>
                                    <?php endif; ?>
                                </div>
                                <?php endif; ?>

                                <?php if (function_exists('mycred_get_buycred_settings')): ?>
                                <div class="points-buy">
                                    <h3><?php _e('Get More Points', 'cvtransformer'); ?></h3>
                                    <p><?php _e('Purchase points to use for premium features.', 'cvtransformer'); ?></p>
                                    <a href="<?php echo esc_url(mycred_get_buycred_page_url()); ?>" class="button button-primary"><?php _e('Buy Points', 'cvtransformer'); ?></a>
                                </div>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- CV View Modal -->
    <div id="cv-modal" class="modal">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2><?php _e('Transformed CV', 'cvtransformer'); ?></h2>
            <div id="cv-modal-content"></div>
        </div>
    </div>
</main>

<script>
jQuery(document).ready(function($) {
    // Tab switching
    $('.nav-tabs a').on('click', function(e) {
        e.preventDefault();

        // Hide all tab panes
        $('.tab-pane').removeClass('active');

        // Show the selected tab pane
        $($(this).attr('href')).addClass('active');

        // Update active tab
        $('.nav-tabs li').removeClass('active');
        $(this).parent().addClass('active');
    });

    // Profile form submission
    $('#profile-form').on('submit', function(e) {
        e.preventDefault();

        $.ajax({
            url: '<?php echo admin_url('admin-ajax.php'); ?>',
            type: 'POST',
            data: {
                action: 'cvtransformer_update_profile',
                nonce: $('#profile_nonce').val(),
                first_name: $('#first-name').val(),
                last_name: $('#last-name').val()
            },
            success: function(response) {
                if (response.success) {
                    alert('<?php _e('Profile updated successfully!', 'cvtransformer'); ?>');
                } else {
                    alert(response.data || '<?php _e('An error occurred while updating your profile.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });

    // Password form submission
    $('#password-form').on('submit', function(e) {
        e.preventDefault();

        var newPassword = $('#new-password').val();
        var confirmPassword = $('#confirm-password').val();

        if (newPassword !== confirmPassword) {
            alert('<?php _e('New passwords do not match.', 'cvtransformer'); ?>');
            return;
        }

        $.ajax({
            url: '<?php echo admin_url('admin-ajax.php'); ?>',
            type: 'POST',
            data: {
                action: 'cvtransformer_change_password',
                nonce: $('#password_nonce').val(),
                current_password: $('#current-password').val(),
                new_password: newPassword
            },
            success: function(response) {
                if (response.success) {
                    alert('<?php _e('Password changed successfully!', 'cvtransformer'); ?>');
                    $('#password-form')[0].reset();
                } else {
                    alert(response.data || '<?php _e('An error occurred while changing your password.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });

    <?php if (!$using_pmpro): // Only show these buttons if not using PMPro ?>
    // Upgrade button
    $('#upgrade-button').on('click', function() {
        if (confirm('<?php _e('Are you sure you want to upgrade to the Pro Plan for £15/month?', 'cvtransformer'); ?>')) {
            // Get pro plan ID
            var proPlans = <?php 
                $pro_plans = get_posts([
                    'post_type' => 'subscription_plan',
                    'posts_per_page' => 1,
                    'meta_query' => [
                        [
                            'key' => '_is_pro',
                            'value' => '1',
                            'compare' => '=',
                        ],
                    ],
                ]);

                echo !empty($pro_plans) ? $pro_plans[0]->ID : 0;
            ?>;

            if (proPlans) {
                $.ajax({
                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_create_payment_link',
                        nonce: '<?php echo wp_create_nonce('cvtransformer_nonce'); ?>',
                        plan_id: proPlans,
                        action_type: 'upgrade'
                    },
                    success: function(response) {
                        if (response.success && response.data.url) {
                            window.location.href = response.data.url;
                        } else {
                            alert(response.data || '<?php _e('An error occurred while creating the payment link.', 'cvtransformer'); ?>');
                        }
                    },
                    error: function() {
                        alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
                    }
                });
            } else {
                alert('<?php _e('Pro plan configuration not found.', 'cvtransformer'); ?>');
            }
        }
    });

    // Downgrade button
    $('#downgrade-button').on('click', function() {
        if (confirm('<?php _e('Are you sure you want to downgrade to the Standard Plan? You will lose access to Pro features at the end of your current billing period.', 'cvtransformer'); ?>')) {
            $.ajax({
                url: '<?php echo admin_url('admin-ajax.php'); ?>',
                type: 'POST',
                data: {
                    action: 'cvtransformer_downgrade_subscription',
                    nonce: '<?php echo wp_create_nonce('cvtransformer_nonce'); ?>'
                },
                success: function(response) {
                    if (response.success) {
                        alert('<?php _e('Your subscription has been downgraded to the Standard Plan. Changes will take effect at the end of your current billing period.', 'cvtransformer'); ?>');
                        location.reload();
                    } else {
                        alert(response.data || '<?php _e('An error occurred while downgrading your subscription.', 'cvtransformer'); ?>');
                    }
                },
                error: function() {
                    alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
                }
            });
        }
    });

    // Cancel button
    $('#cancel-button').on('click', function() {
        if (confirm('<?php _e('Are you sure you want to cancel your subscription? You will lose access to all subscription features at the end of your current billing period.', 'cvtransformer'); ?>')) {
            $.ajax({
                url: '<?php echo admin_url('admin-ajax.php'); ?>',
                type: 'POST',
                data: {
                    action: 'cvtransformer_cancel_subscription',
                    nonce: '<?php echo wp_create_nonce('cvtransformer_nonce'); ?>'
                },
                success: function(response) {
                    if (response.success) {
                        alert('<?php _e('Your subscription has been cancelled. You will continue to have access until the end of your current billing period.', 'cvtransformer'); ?>');
                        location.reload();
                    } else {
                        alert(response.data || '<?php _e('An error occurred while cancelling your subscription.', 'cvtransformer'); ?>');
                    }
                },
                error: function() {
                    alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
                }
            });
        }
    });
    <?php endif; ?>

    // View CV
    $('.view-cv').on('click', function(e) {
        e.preventDefault();

        var transformationId = $(this).data('id');

        $.ajax({
            url: '<?php echo admin_url('admin-ajax.php'); ?>',
            type: 'POST',
            data: {
                action: 'cvtransformer_get_transformation',
                nonce: '<?php echo wp_create_nonce('cvtransformer_nonce'); ?>',
                transformation_id: transformationId
            },
            success: function(response) {
                if (response.success) {
                    $('#cv-modal-content').html(response.data.transformed_content.replace(/\n/g, '<br>'));
                    $('#cv-modal').show();
                } else {
                    alert(response.data || '<?php _e('An error occurred while retrieving the CV.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });

    // Download CV
    $('.download-cv').on('click', function(e) {
        e.preventDefault();

        var transformationId = $(this).data('id');

        $.ajax({
            url: '<?php echo admin_url('admin-ajax.php'); ?>',
            type: 'POST',
            data: {
                action: 'cvtransformer_get_transformation',
                nonce: '<?php echo wp_create_nonce('cvtransformer_nonce'); ?>',
                transformation_id: transformationId
            },
            success: function(response) {
                if (response.success) {
                    var content = response.data.transformed_content;
                    var targetRole = response.data.target_role || 'role';
                    var filename = 'transformed_cv_' + targetRole.replace(/\s+/g, '_') + '_' + new Date().getTime() + '.txt';

                    var element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
                    element.setAttribute('download', filename);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                } else {
                    alert(response.data || '<?php _e('An error occurred while retrieving the CV.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });

    // Close modal
    $('.close').on('click', function() {
        $('#cv-modal').hide();
    });

    // Close modal when clicking outside
    $(window).on('click', function(e) {
        if ($(e.target).is('#cv-modal')) {
            $('#cv-modal').hide();
        }
    });
});
</script>

<style>
.account-container {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 2rem;
    margin: 2rem 0;
}

@media (max-width: 768px) {
    .account-container {
        grid-template-columns: 1fr;
    }
}

.account-nav ul {
    list-style: none;
    margin: 0;
    padding: 0;
}

.account-nav li {
    margin-bottom: 0.5rem;
}

.account-nav a {
    display: block;
    padding: 0.75rem 1rem;
    background-color: var(--light-background);
    border-radius: 0.25rem;
    text-decoration: none;
    color: var(--text-color);
    transition: background-color 0.2s;
}

.account-nav li.active a,
.account-nav a:hover {
    background-color: var(--primary-color);
    color: white;
}

.tab-pane {
    display: none;
}

.tab-pane.active {
    display: block;
}

.account-form {
    margin-bottom: 2rem;
}

.subscription-status {
    text-align: center;
    padding: 2rem;
    margin-bottom: 2rem;
    border-radius: 0.5rem;
}

.subscription-status i {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.subscription-active {
    background-color: rgba(16, 185, 129, 0.1);
}

.subscription-active i {
    color: #10b981;
}

.subscription-trial {
    background-color: rgba(245, 158, 11, 0.1);
}

.subscription-trial i {
    color: #f59e0b;
}

.subscription-inactive {
    background-color: rgba(239, 68, 68, 0.1);
}

.subscription-inactive i {
    color: #ef4444;
}

.subscription-features ul {
    list-style: none;
    padding: 0;
}

.subscription-features li {
    margin-bottom: 0.5rem;
}

.subscription-features i {
    color: #10b981;
    margin-right: 0.5rem;
}

.subscription-actions {
    margin-top: 2rem;
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.data-table {
    width: 100%;
    border-collapse: collapse;
}

.data-table th,
.data-table td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
}

.data-table th {
    font-weight: 600;
    background-color: var(--light-background);
}

.no-data-message {
    text-align: center;
    padding: 2rem;
}

.modal {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto;
    background-color: rgba(0, 0, 0, 0.4);
}

.modal-content {
    background-color: white;
    margin: 10% auto;
    padding: 2rem;
    border-radius: 0.5rem;
    width: 80%;
    max-width: 800px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    position: relative;
}

.close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
}

#cv-modal-content {
    white-space: pre-wrap;
    font-family: monospace;
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
    background-color: var(--light-background);
    border-radius: 0.25rem;
    margin-top: 1rem;
}

/* Points tab styles */
.points-display {
    text-align: center;
    font-size: 2.5rem;
    font-weight: 700;
    margin: 1.5rem 0;
    color: var(--primary-color);
}

.points-label {
    font-size: 1.25rem;
    margin-left: 0.5rem;
    color: var(--text-color);
}

.points-feature-list {
    list-style: none;
    padding: 0;
    margin: 1.5rem 0;
}

.points-feature-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.feature-info {
    display: flex;
    flex-direction: column;
}

.feature-name {
    font-weight: 600;
    margin-bottom: 0.5rem;
}

.feature-cost {
    color: var(--light-text);
    font-size: 0.875rem;
}

.insufficient-points {
    color: var(--error);
    font-size: 0.875rem;
}

.points-history table td.positive {
    color: #10b981;
}

.points-history table td.negative {
    color: #ef4444;
}

.points-buy {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-color);
    text-align: center;
}
</style>

<?php
get_footer();
?>