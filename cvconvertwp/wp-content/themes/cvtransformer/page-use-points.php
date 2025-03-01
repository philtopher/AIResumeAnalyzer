<?php
/**
 * Template Name: Use Points Page
 *
 * This page handles the process of using myCred points for premium features.
 *
 * @package CVTransformer
 */

// Redirect non-logged in users to login page
if (!is_user_logged_in()) {
    wp_redirect(home_url('/login/'));
    exit;
}

// Check if mycred is active
if (!get_theme_mod('mycred_enable', '0') || !function_exists('mycred_get_users_balance')) {
    wp_redirect(home_url('/account/'));
    exit;
}

// Get requested feature
$feature = isset($_GET['use_points']) ? sanitize_text_field($_GET['use_points']) : '';

// Valid features
$valid_features = array(
    'cv_transform',
    'organization_analysis',
    'interviewer_analysis',
    'pro_features'
);

// If no valid feature is specified, redirect to account
if (empty($feature) || !in_array($feature, $valid_features)) {
    wp_redirect(home_url('/account/'));
    exit;
}

// Get user data
$user_id = get_current_user_id();
$balance = mycred_get_users_balance($user_id);

// Get the cost for this feature
$points_required = cvtransformer_get_mycred_feature_cost($feature);

// Check if user has enough points
if ($balance < $points_required) {
    // Not enough points, redirect to account page with error
    $redirect_url = add_query_arg(
        array('error' => 'insufficient_points', 'feature' => $feature),
        home_url('/account/')
    );
    wp_redirect($redirect_url);
    exit;
}

// Process the point deduction
define('CVTRANSFORMER_DEDUCT_POINTS', true); // Tell the function to actually deduct points
$deduction_success = cvtransformer_mycred_deduct_points($feature, $user_id);

if (!$deduction_success) {
    // Deduction failed, redirect to account with error
    $redirect_url = add_query_arg(
        array('error' => 'deduction_failed', 'feature' => $feature),
        home_url('/account/')
    );
    wp_redirect($redirect_url);
    exit;
}

// Set a cookie or session variable to indicate the feature is paid for
$feature_expiry = time() + (24 * 60 * 60); // 24 hours
setcookie('cvtransformer_paid_' . $feature, '1', $feature_expiry, '/');

// Store in user meta as well
update_user_meta($user_id, '_cvtransformer_paid_' . $feature, $feature_expiry);

// Redirect to the appropriate feature page based on what was purchased
switch ($feature) {
    case 'cv_transform':
        wp_redirect(home_url('/cv-transform/'));
        break;
    case 'organization_analysis':
        wp_redirect(home_url('/cv-transform/#organization-section'));
        break;
    case 'interviewer_analysis':
        wp_redirect(home_url('/cv-transform/#interviewer-section'));
        break;
    case 'pro_features':
        // Granting temporary pro access, redirect to account
        wp_redirect(add_query_arg('pro_activated', '1', home_url('/account/')));
        break;
    default:
        wp_redirect(home_url('/account/'));
}
exit;

// Note: The template doesn't have any visible content because it's just a processor
// that redirects immediately after handling the points deduction
?>
