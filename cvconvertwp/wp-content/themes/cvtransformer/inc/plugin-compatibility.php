<?php
/**
 * Plugin Compatibility Functions
 *
 * Functions for integrating with popular WordPress plugins
 *
 * @package CVTransformer
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Paid Membership Pro Compatibility Functions
 */

/**
 * Check if a user has access to premium features
 * Uses Paid Membership Pro if available, otherwise falls back to built-in subscription system
 * 
 * @param string $feature Feature identifier (e.g., 'cv_transform', 'pro_features')
 * @param int $user_id User ID to check, or 0 for current user
 * @return bool True if user has access, false if not
 */
function cvtransformer_check_premium_access($feature = 'cv_transform', $user_id = 0) {
    // If no user ID provided, get current user
    if (!$user_id) {
        $user_id = get_current_user_id();
    }

    // Not logged in = no access
    if (!$user_id) {
        return false;
    }

    // Check if myCred points can be used for this feature
    if (get_theme_mod('mycred_enable', '0') && function_exists('mycred_get_users_balance')) {
        // Get the feature cost
        $points_required = cvtransformer_get_mycred_feature_cost($feature);

        // If feature has a point cost
        if ($points_required > 0) {
            // Get user balance
            $balance = mycred_get_users_balance($user_id);

            // If user has enough points
            if ($balance >= $points_required) {
                // If this is an actual usage and not just a check, deduct the points
                if (defined('CVTRANSFORMER_DEDUCT_POINTS') && CVTRANSFORMER_DEDUCT_POINTS) {
                    cvtransformer_mycred_deduct_points($feature, $user_id);
                }

                return true;
            }
        }
    }

    // If Paid Membership Pro is active, use its permission system
    if (function_exists('pmpro_hasMembershipLevel')) {
        // Check if we need Pro level or any paid level
        $require_pro = ($feature === 'pro_features');

        // Get the levels that correspond to our access requirements
        $required_levels = cvtransformer_get_pmpro_levels($require_pro);

        // Check if user has any of the required levels
        foreach ($required_levels as $level) {
            if (pmpro_hasMembershipLevel($level, $user_id)) {
                return true;
            }
        }

        // No required levels found
        return false;
    }

    // Otherwise use our built-in subscription system
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';

    // If we require pro features
    if ($feature === 'pro_features') {
        return $subscription_status === 'active' && $is_pro;
    }

    // Otherwise, any active subscription is sufficient
    return $subscription_status === 'active';
}

/**
 * Get Paid Membership Pro levels that correspond to our subscription plans
 * 
 * @param bool $pro_only Whether to return only Pro level IDs (true) or all paid level IDs (false)
 * @return array Array of level IDs
 */
function cvtransformer_get_pmpro_levels($pro_only = false) {
    // These level mappings should be configurable in the Customizer
    $standard_levels = get_theme_mod('pmpro_standard_levels', '');
    $pro_levels = get_theme_mod('pmpro_pro_levels', '');

    // Convert comma-separated strings to arrays
    $standard_level_ids = $standard_levels ? array_map('trim', explode(',', $standard_levels)) : array();
    $pro_level_ids = $pro_levels ? array_map('trim', explode(',', $pro_levels)) : array();

    // Return only pro levels if requested
    if ($pro_only) {
        return $pro_level_ids;
    }

    // Otherwise return all paid levels (both standard and pro)
    return array_merge($standard_level_ids, $pro_level_ids);
}

/**
 * Add Customizer settings for Paid Membership Pro integration
 * 
 * @param WP_Customize_Manager $wp_customize Customizer object
 */
function cvtransformer_pmpro_customizer($wp_customize) {
    // Skip if Paid Membership Pro is not active
    if (!function_exists('pmpro_getAllLevels')) {
        return;
    }

    // Get all available membership levels
    $levels = pmpro_getAllLevels(true);
    $level_choices = array();

    // Create options for each level
    if (!empty($levels)) {
        foreach ($levels as $level) {
            $level_choices[$level->id] = $level->name;
        }
    }

    // Add Paid Membership Pro section
    $wp_customize->add_section('cvtransformer_pmpro_options', array(
        'title' => __('Paid Membership Pro', 'cvtransformer'),
        'description' => __('Configure integration with Paid Membership Pro plugin.', 'cvtransformer'),
        'priority' => 150,
    ));

    // Add setting for Standard level mapping
    $wp_customize->add_setting('pmpro_standard_levels', array(
        'default' => '',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'sanitize_text_field',
    ));

    // Add control for Standard level mapping
    $wp_customize->add_control('pmpro_standard_levels', array(
        'label' => __('Standard Plan Levels', 'cvtransformer'),
        'description' => __('Enter the Paid Membership Pro level IDs (comma-separated) that should have Standard plan access.', 'cvtransformer'),
        'section' => 'cvtransformer_pmpro_options',
        'type' => 'text',
    ));

    // Add setting for Pro level mapping
    $wp_customize->add_setting('pmpro_pro_levels', array(
        'default' => '',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'sanitize_text_field',
    ));

    // Add control for Pro level mapping
    $wp_customize->add_control('pmpro_pro_levels', array(
        'label' => __('Pro Plan Levels', 'cvtransformer'),
        'description' => __('Enter the Paid Membership Pro level IDs (comma-separated) that should have Pro plan access.', 'cvtransformer'),
        'section' => 'cvtransformer_pmpro_options',
        'type' => 'text',
    ));
}
add_action('customize_register', 'cvtransformer_pmpro_customizer');

/**
 * myCred Compatibility Functions
 */

/**
 * Check if user has enough points for a feature
 * 
 * @param string $feature Feature identifier (e.g., 'cv_transformation', 'organization_analysis')
 * @param int $user_id User ID to check, or 0 for current user
 * @return bool True if user has enough points, false if not
 */
function cvtransformer_mycred_has_points($feature, $user_id = 0) {
    // If myCred is not active, return false
    if (!function_exists('mycred_get_users_balance')) {
        return false;
    }

    // If no user ID provided, get current user
    if (!$user_id) {
        $user_id = get_current_user_id();
    }

    // Not logged in = no access
    if (!$user_id) {
        return false;
    }

    // Get the point cost for the requested feature
    $required_points = cvtransformer_get_mycred_feature_cost($feature);

    // If feature doesn't require points, grant access
    if ($required_points <= 0) {
        return true;
    }

    // Get user's balance
    $balance = mycred_get_users_balance($user_id);

    // Return true if balance is sufficient
    return $balance >= $required_points;
}

/**
 * Get the point cost for a specific feature
 * 
 * @param string $feature Feature identifier
 * @return int Point cost
 */
function cvtransformer_get_mycred_feature_cost($feature) {
    // Default costs from theme options
    $costs = array(
        'cv_transform' => get_theme_mod('mycred_cost_cv_transform', 0),
        'organization_analysis' => get_theme_mod('mycred_cost_org_analysis', 0),
        'interviewer_analysis' => get_theme_mod('mycred_cost_interviewer_analysis', 0),
    );

    // Return the cost for the requested feature, or 0 if not defined
    return isset($costs[$feature]) ? intval($costs[$feature]) : 0;
}

/**
 * Deduct points for using a feature
 * 
 * @param string $feature Feature identifier
 * @param int $user_id User ID, or 0 for current user
 * @return bool True if points were deducted, false if failed
 */
function cvtransformer_mycred_deduct_points($feature, $user_id = 0) {
    // If myCred is not active, return false
    if (!function_exists('mycred') || !function_exists('mycred_get_users_balance')) {
        return false;
    }

    // If no user ID provided, get current user
    if (!$user_id) {
        $user_id = get_current_user_id();
    }

    // Not logged in = can't deduct
    if (!$user_id) {
        return false;
    }

    // Get the point cost
    $cost = cvtransformer_get_mycred_feature_cost($feature);

    // No cost = nothing to deduct
    if ($cost <= 0) {
        return true;
    }

    // Check if user has enough points
    if (!cvtransformer_mycred_has_points($feature, $user_id)) {
        return false;
    }

    // Get myCred instance
    $mycred = mycred();

    // Generate log entry
    $log_entry = sprintf(__('Cost for using %s feature', 'cvtransformer'), $feature);

    // Deduct points (negative amount = deduction)
    $result = $mycred->add_creds(
        'feature_use',
        $user_id,
        -$cost,
        $log_entry,
        0,
        '',
        'cvtransformer'
    );

    return $result !== false;
}

/**
 * Add Customizer settings for myCred integration
 * 
 * @param WP_Customize_Manager $wp_customize Customizer object
 */
function cvtransformer_mycred_customizer($wp_customize) {
    // Skip if myCred is not active
    if (!function_exists('mycred')) {
        return;
    }

    // Add myCred section
    $wp_customize->add_section('cvtransformer_mycred_options', array(
        'title' => __('myCred Integration', 'cvtransformer'),
        'description' => __('Configure integration with myCred plugin for point-based features.', 'cvtransformer'),
        'priority' => 151,
    ));

    // Enable/disable myCred for features
    $wp_customize->add_setting('mycred_enable', array(
        'default' => '0',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'absint',
    ));

    $wp_customize->add_control('mycred_enable', array(
        'label' => __('Enable myCred Integration', 'cvtransformer'),
        'description' => __('Enable point-based system for features.', 'cvtransformer'),
        'section' => 'cvtransformer_mycred_options',
        'type' => 'checkbox',
    ));

    // Cost for CV Transformation
    $wp_customize->add_setting('mycred_cost_cv_transform', array(
        'default' => '0',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'absint',
    ));

    $wp_customize->add_control('mycred_cost_cv_transform', array(
        'label' => __('CV Transformation Cost', 'cvtransformer'),
        'description' => __('Points required for CV transformation (0 = free/use subscription).', 'cvtransformer'),
        'section' => 'cvtransformer_mycred_options',
        'type' => 'number',
        'input_attrs' => array(
            'min' => 0,
            'step' => 1,
        ),
    ));

    // Cost for Organization Analysis
    $wp_customize->add_setting('mycred_cost_org_analysis', array(
        'default' => '0',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'absint',
    ));

    $wp_customize->add_control('mycred_cost_org_analysis', array(
        'label' => __('Organization Analysis Cost', 'cvtransformer'),
        'description' => __('Points required for organization analysis (0 = free/use subscription).', 'cvtransformer'),
        'section' => 'cvtransformer_mycred_options',
        'type' => 'number',
        'input_attrs' => array(
            'min' => 0,
            'step' => 1,
        ),
    ));

    // Cost for Interviewer Analysis
    $wp_customize->add_setting('mycred_cost_interviewer_analysis', array(
        'default' => '0',
        'capability' => 'edit_theme_options',
        'sanitize_callback' => 'absint',
    ));

    $wp_customize->add_control('mycred_cost_interviewer_analysis', array(
        'label' => __('Interviewer Analysis Cost', 'cvtransformer'),
        'description' => __('Points required for interviewer analysis (0 = free/use subscription).', 'cvtransformer'),
        'section' => 'cvtransformer_mycred_options',
        'type' => 'number',
        'input_attrs' => array(
            'min' => 0,
            'step' => 1,
        ),
    ));
}
add_action('customize_register', 'cvtransformer_mycred_customizer');