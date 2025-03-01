<?php
/**
 * CV Transformer functions and definitions
 *
 * @package CVTransformer
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define theme constants
define('CVTRANSFORMER_VERSION', '1.0.0');
define('CVTRANSFORMER_DIR', get_template_directory());
define('CVTRANSFORMER_URI', get_template_directory_uri());

/**
 * Sets up theme defaults and registers support for various WordPress features.
 */
function cvtransformer_setup() {
    // Add default posts and comments RSS feed links to head.
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title.
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages.
    add_theme_support('post-thumbnails');

    // This theme uses wp_nav_menu() in two locations.
    register_nav_menus(array(
        'primary' => esc_html__('Primary Menu', 'cvtransformer'),
        'footer' => esc_html__('Footer Menu', 'cvtransformer'),
    ));

    // Switch default core markup for search form, comment form, and comments to output valid HTML5.
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));

    // Add theme support for selective refresh for widgets.
    add_theme_support('customize-selective-refresh-widgets');

    // Add support for full and wide align images.
    add_theme_support('align-wide');

    // Add support for responsive embeds.
    add_theme_support('responsive-embeds');
}
add_action('after_setup_theme', 'cvtransformer_setup');

/**
 * Register widget areas.
 */
function cvtransformer_widgets_init() {
    register_sidebar(array(
        'name'          => esc_html__('Sidebar', 'cvtransformer'),
        'id'            => 'sidebar-1',
        'description'   => esc_html__('Add widgets here.', 'cvtransformer'),
        'before_widget' => '<section id="%1$s" class="widget %2$s">',
        'after_widget'  => '</section>',
        'before_title'  => '<h2 class="widget-title">',
        'after_title'   => '</h2>',
    ));

    // Footer widget areas
    for ($i = 1; $i <= 4; $i++) {
        register_sidebar(array(
            'name'          => sprintf(esc_html__('Footer %d', 'cvtransformer'), $i),
            'id'            => 'footer-' . $i,
            'description'   => sprintf(esc_html__('Add widgets here for footer column %d.', 'cvtransformer'), $i),
            'before_widget' => '<div id="%1$s" class="widget %2$s">',
            'after_widget'  => '</div>',
            'before_title'  => '<h3 class="widget-title">',
            'after_title'   => '</h3>',
        ));
    }
}
add_action('widgets_init', 'cvtransformer_widgets_init');

/**
 * Enqueue scripts and styles.
 */
function cvtransformer_scripts() {
    // Enqueue Google Fonts
    wp_enqueue_style('cvtransformer-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', array(), null);

    // Enqueue theme stylesheet
    wp_enqueue_style('cvtransformer-style', get_stylesheet_uri(), array(), CVTRANSFORMER_VERSION);

    // Enqueue Font Awesome for icons
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css', array(), '6.0.0');

    // Enqueue custom JavaScript
    wp_enqueue_script('cvtransformer-script', CVTRANSFORMER_URI . '/assets/js/main.js', array('jquery'), CVTRANSFORMER_VERSION, true);

    // Add localized data for AJAX requests
    wp_localize_script('cvtransformer-script', 'cvtransformer_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('cvtransformer_nonce'),
    ));

    // Stripe JavaScript
    if (is_page('pricing') || is_page('checkout') || is_page('account')) {
        wp_enqueue_script('stripe-js', 'https://js.stripe.com/v3/', array(), null, true);
        wp_enqueue_script('cvtransformer-stripe', CVTRANSFORMER_URI . '/assets/js/stripe-integration.js', array('jquery', 'stripe-js'), CVTRANSFORMER_VERSION, true);

        wp_localize_script('cvtransformer-stripe', 'stripe_params', array(
            'publishable_key' => get_option('cvtransformer_stripe_publishable_key'),
        ));
    }
}
add_action('wp_enqueue_scripts', 'cvtransformer_scripts');

/**
 * Register Custom Post Types
 */
function cvtransformer_register_post_types() {
    // CV Transformations Post Type
    $labels = array(
        'name'                  => _x('CV Transformations', 'Post type general name', 'cvtransformer'),
        'singular_name'         => _x('CV Transformation', 'Post type singular name', 'cvtransformer'),
        'menu_name'             => _x('CV Transformations', 'Admin Menu text', 'cvtransformer'),
        'name_admin_bar'        => _x('CV Transformation', 'Add New on Toolbar', 'cvtransformer'),
        'add_new'               => __('Add New', 'cvtransformer'),
        'add_new_item'          => __('Add New CV Transformation', 'cvtransformer'),
        'new_item'              => __('New CV Transformation', 'cvtransformer'),
        'edit_item'             => __('Edit CV Transformation', 'cvtransformer'),
        'view_item'             => __('View CV Transformation', 'cvtransformer'),
        'all_items'             => __('All CV Transformations', 'cvtransformer'),
        'search_items'          => __('Search CV Transformations', 'cvtransformer'),
        'not_found'             => __('No CV transformations found.', 'cvtransformer'),
        'not_found_in_trash'    => __('No CV transformations found in Trash.', 'cvtransformer'),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => false,
        'publicly_queryable' => false,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'capability_type'    => 'post',
        'has_archive'        => false,
        'hierarchical'       => false,
        'menu_position'      => null,
        'menu_icon'          => 'dashicons-media-document',
        'supports'           => array('title'),
    );

    register_post_type('cv_transformation', $args);

    // Subscription Plans Post Type
    $labels = array(
        'name'                  => _x('Subscription Plans', 'Post type general name', 'cvtransformer'),
        'singular_name'         => _x('Subscription Plan', 'Post type singular name', 'cvtransformer'),
        'menu_name'             => _x('Subscription Plans', 'Admin Menu text', 'cvtransformer'),
        'name_admin_bar'        => _x('Subscription Plan', 'Add New on Toolbar', 'cvtransformer'),
        'add_new'               => __('Add New', 'cvtransformer'),
        'add_new_item'          => __('Add New Subscription Plan', 'cvtransformer'),
        'new_item'              => __('New Subscription Plan', 'cvtransformer'),
        'edit_item'             => __('Edit Subscription Plan', 'cvtransformer'),
        'view_item'             => __('View Subscription Plan', 'cvtransformer'),
        'all_items'             => __('All Subscription Plans', 'cvtransformer'),
        'search_items'          => __('Search Subscription Plans', 'cvtransformer'),
        'not_found'             => __('No subscription plans found.', 'cvtransformer'),
        'not_found_in_trash'    => __('No subscription plans found in Trash.', 'cvtransformer'),
    );

    $args = array(
        'labels'             => $labels,
        'public'             => false,
        'publicly_queryable' => false,
        'show_ui'            => true,
        'show_in_menu'       => true,
        'query_var'          => true,
        'capability_type'    => 'post',
        'has_archive'        => false,
        'hierarchical'       => false,
        'menu_position'      => null,
        'menu_icon'          => 'dashicons-tickets-alt',
        'supports'           => array('title', 'editor'),
    );

    register_post_type('subscription_plan', $args);
}
add_action('init', 'cvtransformer_register_post_types');

/**
 * Register Custom Meta Boxes
 */
function cvtransformer_register_meta_boxes() {
    // CV Transformation Meta Box
    add_meta_box(
        'cv_transformation_details',
        __('CV Transformation Details', 'cvtransformer'),
        'cvtransformer_cv_transformation_meta_box_callback',
        'cv_transformation',
        'normal',
        'high'
    );

    // Subscription Plan Meta Box
    add_meta_box(
        'subscription_plan_details',
        __('Subscription Plan Details', 'cvtransformer'),
        'cvtransformer_subscription_plan_meta_box_callback',
        'subscription_plan',
        'normal',
        'high'
    );
}
add_action('add_meta_boxes', 'cvtransformer_register_meta_boxes');

/**
 * CV Transformation Meta Box Callback
 */
function cvtransformer_cv_transformation_meta_box_callback($post) {
    // Add a nonce field
    wp_nonce_field('cvtransformer_cv_transformation_meta_box', 'cvtransformer_cv_transformation_meta_box_nonce');

    // Get the current values
    $user_id = get_post_meta($post->ID, '_user_id', true);
    $original_content = get_post_meta($post->ID, '_original_content', true);
    $transformed_content = get_post_meta($post->ID, '_transformed_content', true);
    $target_role = get_post_meta($post->ID, '_target_role', true);
    $job_description = get_post_meta($post->ID, '_job_description', true);
    $score = get_post_meta($post->ID, '_score', true);
    $feedback = get_post_meta($post->ID, '_feedback', true);

    // Output fields
    ?>
    <div class="cvtransformer-meta-box">
        <p>
            <label for="cvtransformer-user-id"><?php _e('User ID:', 'cvtransformer'); ?></label>
            <input type="text" id="cvtransformer-user-id" name="cvtransformer_user_id" value="<?php echo esc_attr($user_id); ?>" readonly>
        </p>
        <p>
            <label for="cvtransformer-target-role"><?php _e('Target Role:', 'cvtransformer'); ?></label>
            <input type="text" id="cvtransformer-target-role" name="cvtransformer_target_role" value="<?php echo esc_attr($target_role); ?>">
        </p>
        <p>
            <label for="cvtransformer-score"><?php _e('Match Score:', 'cvtransformer'); ?></label>
            <input type="number" id="cvtransformer-score" name="cvtransformer_score" value="<?php echo esc_attr($score); ?>" min="0" max="100">
        </p>
        <div class="cvtransformer-content-comparison">
            <div class="cvtransformer-content-column">
                <h3><?php _e('Original CV Content', 'cvtransformer'); ?></h3>
                <textarea name="cvtransformer_original_content" rows="10" style="width:100%;"><?php echo esc_textarea($original_content); ?></textarea>
            </div>
            <div class="cvtransformer-content-column">
                <h3><?php _e('Transformed CV Content', 'cvtransformer'); ?></h3>
                <textarea name="cvtransformer_transformed_content" rows="10" style="width:100%;"><?php echo esc_textarea($transformed_content); ?></textarea>
            </div>
        </div>
        <div>
            <h3><?php _e('Job Description', 'cvtransformer'); ?></h3>
            <textarea name="cvtransformer_job_description" rows="5" style="width:100%;"><?php echo esc_textarea($job_description); ?></textarea>
        </div>
        <div>
            <h3><?php _e('Feedback', 'cvtransformer'); ?></h3>
            <textarea name="cvtransformer_feedback" rows="5" style="width:100%;"><?php echo esc_textarea($feedback); ?></textarea>
        </div>
    </div>
    <style>
        .cvtransformer-content-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 20px;
        }
        @media (max-width: 768px) {
            .cvtransformer-content-comparison {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <?php
}

/**
 * Subscription Plan Meta Box Callback
 */
function cvtransformer_subscription_plan_meta_box_callback($post) {
    // Add a nonce field
    wp_nonce_field('cvtransformer_subscription_plan_meta_box', 'cvtransformer_subscription_plan_meta_box_nonce');

    // Get the current values
    $price = get_post_meta($post->ID, '_price', true);
    $is_pro = get_post_meta($post->ID, '_is_pro', true);
    $stripe_price_id = get_post_meta($post->ID, '_stripe_price_id', true);

    // Output fields
    ?>
    <div class="cvtransformer-meta-box">
        <p>
            <label for="cvtransformer-price"><?php _e('Monthly Price (£):', 'cvtransformer'); ?></label>
            <input type="number" id="cvtransformer-price" name="cvtransformer_price" value="<?php echo esc_attr($price); ?>" step="0.01" min="0">
        </p>
        <p>
            <label for="cvtransformer-is-pro"><?php _e('Is Pro Plan:', 'cvtransformer'); ?></label>
            <input type="checkbox" id="cvtransformer-is-pro" name="cvtransformer_is_pro" value="1" <?php checked($is_pro, '1'); ?>>
        </p>
        <p>
            <label for="cvtransformer-stripe-price-id"><?php _e('Stripe Price ID:', 'cvtransformer'); ?></label>
            <input type="text" id="cvtransformer-stripe-price-id" name="cvtransformer_stripe_price_id" value="<?php echo esc_attr($stripe_price_id); ?>">
        </p>
    </div>
    <?php
}

/**
 * Save CV Transformation Meta
 */
function cvtransformer_save_cv_transformation_meta($post_id) {
    // Check if our nonce is set and verify it
    if (!isset($_POST['cvtransformer_cv_transformation_meta_box_nonce']) || 
        !wp_verify_nonce($_POST['cvtransformer_cv_transformation_meta_box_nonce'], 'cvtransformer_cv_transformation_meta_box')) {
        return;
    }

    // Check the user's permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Update the meta fields
    if (isset($_POST['cvtransformer_target_role'])) {
        update_post_meta($post_id, '_target_role', sanitize_text_field($_POST['cvtransformer_target_role']));
    }

    if (isset($_POST['cvtransformer_score'])) {
        update_post_meta($post_id, '_score', intval($_POST['cvtransformer_score']));
    }

    if (isset($_POST['cvtransformer_original_content'])) {
        update_post_meta($post_id, '_original_content', wp_kses_post($_POST['cvtransformer_original_content']));
    }

    if (isset($_POST['cvtransformer_transformed_content'])) {
        update_post_meta($post_id, '_transformed_content', wp_kses_post($_POST['cvtransformer_transformed_content']));
    }

    if (isset($_POST['cvtransformer_job_description'])) {
        update_post_meta($post_id, '_job_description', wp_kses_post($_POST['cvtransformer_job_description']));
    }

    if (isset($_POST['cvtransformer_feedback'])) {
        update_post_meta($post_id, '_feedback', wp_kses_post($_POST['cvtransformer_feedback']));
    }
}
add_action('save_post_cv_transformation', 'cvtransformer_save_cv_transformation_meta');

/**
 * Save Subscription Plan Meta
 */
function cvtransformer_save_subscription_plan_meta($post_id) {
    // Check if our nonce is set and verify it
    if (!isset($_POST['cvtransformer_subscription_plan_meta_box_nonce']) || 
        !wp_verify_nonce($_POST['cvtransformer_subscription_plan_meta_box_nonce'], 'cvtransformer_subscription_plan_meta_box')) {
        return;
    }

    // Check the user's permissions
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    // Update the meta fields
    if (isset($_POST['cvtransformer_price'])) {
        update_post_meta($post_id, '_price', floatval($_POST['cvtransformer_price']));
    }

    $is_pro = isset($_POST['cvtransformer_is_pro']) ? '1' : '0';
    update_post_meta($post_id, '_is_pro', $is_pro);

    if (isset($_POST['cvtransformer_stripe_price_id'])) {
        update_post_meta($post_id, '_stripe_price_id', sanitize_text_field($_POST['cvtransformer_stripe_price_id']));
    }
}
add_action('save_post_subscription_plan', 'cvtransformer_save_subscription_plan_meta');

/**
 * Add Subscription Status to User Profile
 */
function cvtransformer_add_user_subscription_meta($user) {
    if (!current_user_can('edit_user', $user->ID)) {
        return;
    }

    // Get user subscription status
    $subscription_status = get_user_meta($user->ID, '_subscription_status', true);
    $is_pro = get_user_meta($user->ID, '_subscription_is_pro', true);
    $stripe_customer_id = get_user_meta($user->ID, '_stripe_customer_id', true);
    $stripe_subscription_id = get_user_meta($user->ID, '_stripe_subscription_id', true);
    $subscription_expiry = get_user_meta($user->ID, '_subscription_expiry', true);

    ?>
    <h3><?php _e('Subscription Information', 'cvtransformer'); ?></h3>
    <table class="form-table">
        <tr>
            <th><label for="subscription_status"><?php _e('Subscription Status', 'cvtransformer'); ?></label></th>
            <td>
                <select name="subscription_status" id="subscription_status">
                    <option value="" <?php selected($subscription_status, ''); ?>><?php _e('None', 'cvtransformer'); ?></option>
                    <option value="active" <?php selected($subscription_status, 'active'); ?>><?php _e('Active', 'cvtransformer'); ?></option>
                    <option value="cancelled" <?php selected($subscription_status, 'cancelled'); ?>><?php _e('Cancelled', 'cvtransformer'); ?></option>
                    <option value="expired" <?php selected($subscription_status, 'expired'); ?>><?php _e('Expired', 'cvtransformer'); ?></option>
                </select>
            </td>
        </tr>
        <tr>
            <th><label for="is_pro_subscription"><?php _e('Pro Subscription', 'cvtransformer'); ?></label></th>
            <td>
                <input type="checkbox" name="is_pro_subscription" id="is_pro_subscription" value="1" <?php checked($is_pro, '1'); ?>>
                <span class="description"><?php _e('User has a Pro plan subscription', 'cvtransformer'); ?></span>
            </td>
        </tr>
        <tr>
            <th><label for="stripe_customer_id"><?php _e('Stripe Customer ID', 'cvtransformer'); ?></label></th>
            <td>
                <input type="text" name="stripe_customer_id" id="stripe_customer_id" value="<?php echo esc_attr($stripe_customer_id); ?>" class="regular-text">
            </td>
        </tr>
        <tr>
            <th><label for="stripe_subscription_id"><?php _e('Stripe Subscription ID', 'cvtransformer'); ?></label></th>
            <td>
                <input type="text" name="stripe_subscription_id" id="stripe_subscription_id" value="<?php echo esc_attr($stripe_subscription_id); ?>" class="regular-text">
            </td>
        </tr>
        <tr>
            <th><label for="subscription_expiry"><?php _e('Subscription Expiry', 'cvtransformer'); ?></label></th>
            <td>
                <input type="date" name="subscription_expiry" id="subscription_expiry" value="<?php echo esc_attr($subscription_expiry); ?>" class="regular-text">
            </td>
        </tr>
    </table>
    <?php
}
add_action('edit_user_profile', 'cvtransformer_add_user_subscription_meta');
add_action('show_user_profile', 'cvtransformer_add_user_subscription_meta');

/**
 * Save User Subscription Meta
 */
function cvtransformer_save_user_subscription_meta($user_id) {
    if (!current_user_can('edit_user', $user_id)) {
        return false;
    }

    update_user_meta($user_id, '_subscription_status', sanitize_text_field($_POST['subscription_status']));
    update_user_meta($user_id, '_subscription_is_pro', isset($_POST['is_pro_subscription']) ? '1' : '0');
    update_user_meta($user_id, '_stripe_customer_id', sanitize_text_field($_POST['stripe_customer_id']));
    update_user_meta($user_id, '_stripe_subscription_id', sanitize_text_field($_POST['stripe_subscription_id']));
    update_user_meta($user_id, '_subscription_expiry', sanitize_text_field($_POST['subscription_expiry']));
}
add_action('personal_options_update', 'cvtransformer_save_user_subscription_meta');
add_action('edit_user_profile_update', 'cvtransformer_save_user_subscription_meta');

/**
 * Create Stripe Payment Link
 * AJAX handler for creating Stripe payment session
 */
function cvtransformer_create_payment_link() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error('User not authenticated');
    }

    // Get current user
    $user_id = get_current_user_id();
    $user = get_userdata($user_id);

    // Get subscription plan
    $plan_id = isset($_POST['plan_id']) ? intval($_POST['plan_id']) : 0;
    $action = isset($_POST['action_type']) ? sanitize_text_field($_POST['action_type']) : 'subscribe';

    if (!$plan_id) {
        wp_send_json_error('Plan ID is required');
    }

    // Get plan details
    $price = get_post_meta($plan_id, '_price', true);
    $is_pro = get_post_meta($plan_id, '_is_pro', true) === '1';
    $stripe_price_id = get_post_meta($plan_id, '_stripe_price_id', true);

    if (!$stripe_price_id) {
        wp_send_json_error('Invalid plan configuration');
    }

    // Check current subscription status
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $current_is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';

    // Check if this is an upgrade from Standard to Pro
    $is_upgrade = $action === 'upgrade' && $subscription_status === 'active' && !$current_is_pro && $is_pro;

    try {
        // Load Stripe PHP SDK
        require_once CVTRANSFORMER_DIR . '/includes/stripe/init.php';

        // Set your secret key
        \Stripe\Stripe::setApiKey(get_option('cvtransformer_stripe_secret_key'));

        // Create Stripe checkout session
        $session = \Stripe\Checkout\Session::create([
            'payment_method_types' => ['card'],
            'line_items' => [
                [
                    'price' => $stripe_price_id,
                    'quantity' => 1,
                ],
            ],
            'mode' => 'subscription',
            'success_url' => home_url('/payment-success/?user_id=' . $user_id),
            'cancel_url' => home_url('/pricing/'),
            'customer_email' => $user->user_email,
            'client_reference_id' => strval($user_id),
            'metadata' => [
                'user_id' => $user_id,
                'plan_id' => $plan_id,
                'is_pro' => $is_pro ? 'true' : 'false',
                'is_upgrade' => $is_upgrade ? 'true' : 'false',
            ],
        ]);

        wp_send_json_success(['url' => $session->url]);

    } catch (Exception $e) {
        wp_send_json_error($e->getMessage());
    }
}
add_action('wp_ajax_cvtransformer_create_payment_link', 'cvtransformer_create_payment_link');

/**
 * Verify Subscription Status
 * AJAX handler for confirming payment and subscription
 */
function cvtransformer_verify_subscription() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Get user ID
    $user_id = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;

    if (!$user_id) {
        wp_send_json_error('User ID is required');
    }

    try {
        // Check for subscription
        $subscription_status = get_user_meta($user_id, '_subscription_status', true);
        $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';

        if ($subscription_status !== 'active') {
            wp_send_json_error(['is_subscribed' => false, 'message' => 'No active subscription found']);
        }

        wp_send_json_success([
            'is_subscribed' => true,
            'is_pro' => $is_pro,
        ]);

    } catch (Exception $e) {
        wp_send_json_error($e->getMessage());
    }
}
add_action('wp_ajax_cvtransformer_verify_subscription', 'cvtransformer_verify_subscription');

/**
 * Downgrade Subscription
 * AJAX handler for downgrading from Pro to Standard
 */
function cvtransformer_downgrade_subscription() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error('User not authenticated');
    }

    // Get current user
    $user_id = get_current_user_id();

    // Check current subscription status
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';
    $stripe_subscription_id = get_user_meta($user_id, '_stripe_subscription_id', true);

    if ($subscription_status !== 'active' || !$is_pro || !$stripe_subscription_id) {
        wp_send_json_error('No active Pro subscription found');
    }

    try {
        // Load Stripe PHP SDK
        require_once CVTRANSFORMER_DIR . '/includes/stripe/init.php';

        // Set your secret key
        \Stripe\Stripe::setApiKey(get_option('cvtransformer_stripe_secret_key'));

        // Get Standard plan price ID
        $standard_plan_price_id = '';
        $standard_plans = get_posts([
            'post_type' => 'subscription_plan',
            'posts_per_page' => 1,
            'meta_query' => [
                [
                    'key' => '_is_pro',
                    'value' => '0',
                    'compare' => '=',
                ],
            ],
        ]);

        if (!empty($standard_plans)) {
            $standard_plan_price_id = get_post_meta($standard_plans[0]->ID, '_stripe_price_id', true);
        }

        if (!$standard_plan_price_id) {
            wp_send_json_error('Standard plan not configured');
        }

        // Retrieve the subscription
        $subscription = \Stripe\Subscription::retrieve($stripe_subscription_id);

        // Get the first subscription item ID
        $item_id = $subscription->items->data[0]->id;

        // Update the subscription to Standard plan
        \Stripe\Subscription::update(
            $stripe_subscription_id,
            [
                'items' => [
                    [
                        'id' => $item_id,
                        'price' => $standard_plan_price_id,
                    ],
                ],
                'proration_behavior' => 'create_prorations',
            ]
        );

        // Update user meta
        update_user_meta($user_id, '_subscription_is_pro', '0');

        wp_send_json_success(['message' => 'Successfully downgraded to Standard plan']);

    } catch (Exception $e) {
        wp_send_json_error($e->getMessage());
    }
}
add_action('wp_ajax_cvtransformer_downgrade_subscription', 'cvtransformer_downgrade_subscription');

/**
 * Process CV Transformation
 * AJAX handler for transforming uploaded CV
 */
function cvtransformer_process_cv_transformation() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error('User not authenticated');
    }

    // Get current user
    $user_id = get_current_user_id();

    // Check subscription status
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);

    if ($subscription_status !== 'active') {
        wp_send_json_error('Active subscription required');
    }

    // Check file upload
    if (empty($_FILES['cv_file']) || $_FILES['cv_file']['error'] !== UPLOAD_ERR_OK) {
        wp_send_json_error('CV file is required');
    }

    // Get form data
    $target_role = isset($_POST['target_role']) ? sanitize_text_field($_POST['target_role']) : '';
    $job_description = isset($_POST['job_description']) ? sanitize_textarea_field($_POST['job_description']) : '';

    if (empty($target_role) || empty($job_description)) {
        wp_send_json_error('Target role and job description are required');
    }

    // Check file type
    $file_type = strtolower(pathinfo($_FILES['cv_file']['name'], PATHINFO_EXTENSION));
    if (!in_array($file_type, ['pdf', 'docx'])) {
        wp_send_json_error('Only PDF and DOCX files are supported');
    }

    // Process the CV file
    try {
        // Get file content (simulate CV transformation)
        $original_content = 'Original CV content would be extracted here';

        // In a real implementation, you would extract text and process the CV
        // For demonstration, we'll create a simulated transformed content
        $transformed_content = "TRANSFORMED CV FOR: {$target_role}\n\n";
        $transformed_content .= "CONTACT INFORMATION\n";
        $transformed_content .= "John Doe\n";
        $transformed_content .= "Email: john.doe@example.com\n```php
        $transformed_content .= "Phone: +44 (0) 123 456 7890\n\n";
        $transformed_content .= "PROFESSIONAL SUMMARY\n";
        $transformed_content .= "Experienced professional with expertise relevant to the {$target_role} position. " .
                               "Proven track record of success in delivering projects and exceeding expectations.\n\n";
        $transformed_content .= "WORK EXPERIENCE\n";
        $transformed_content .= "Senior Developer, ABC Technology Ltd., 2018-Present\n";
        $transformed_content .= "- Led development of key projects resulting in 25% increase in efficiency\n";
        $transformed_content .= "- Managed team of 5 developers and implemented Agile methodologies\n";
        $transformed_content .= "- Optimized database performance by 40%\n\n";
        $transformed_content .= "EDUCATION\n";
        $transformed_content .= "BSc Computer Science, University of Example, 2014-2018\n\n";
        $transformed_content .= "SKILLS\n";
        $transformed_content .= "- Programming languages relevant to {$target_role}\n";
        $transformed_content .= "- Project management\n";
        $transformed_content .= "- Team leadership\n";

        // Generate mock feedback
        $feedback = [
            'strengths' => [
                'Strong technical skills relevant to the role',
                'Clear presentation of work experience',
                'Quantifiable achievements included',
            ],
            'weaknesses' => [
                'Could improve keyword optimization',
                'Missing specific technologies mentioned in job description',
                'Experience section could be more tailored to the role',
            ],
            'suggestions' => [
                'Add more specific keywords from the job description',
                'Reorganize skills section to highlight most relevant skills first',
                'Include a projects section showcasing relevant work',
            ],
        ];

        // Calculate match score (65-95 range for demo)
        $score = mt_rand(65, 95);

        // Create CV transformation post
        $post_id = wp_insert_post([
            'post_title' => "CV Transformation - {$target_role} - " . current_time('mysql'),
            'post_type' => 'cv_transformation',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            wp_send_json_error($post_id->get_error_message());
        }

        // Save meta data
        update_post_meta($post_id, '_user_id', $user_id);
        update_post_meta($post_id, '_original_content', $original_content);
        update_post_meta($post_id, '_transformed_content', $transformed_content);
        update_post_meta($post_id, '_target_role', $target_role);
        update_post_meta($post_id, '_job_description', $job_description);
        update_post_meta($post_id, '_score', $score);
        update_post_meta($post_id, '_feedback', $feedback);

        wp_send_json_success([
            'id' => $post_id,
            'transformed_content' => $transformed_content,
            'score' => $score,
            'feedback' => $feedback,
        ]);

    } catch (Exception $e) {
        wp_send_json_error($e->getMessage());
    }
}
add_action('wp_ajax_cvtransformer_process_cv_transformation', 'cvtransformer_process_cv_transformation');

/**
 * Process Public CV Transformation
 * AJAX handler for public/free CV transformation (with limitations)
 */
function cvtransformer_process_public_cv_transformation() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check file upload
    if (empty($_FILES['cv_file']) || $_FILES['cv_file']['error'] !== UPLOAD_ERR_OK) {
        wp_send_json_error('CV file is required');
    }

    // Get form data
    $target_role = isset($_POST['target_role']) ? sanitize_text_field($_POST['target_role']) : '';
    $job_description = isset($_POST['job_description']) ? sanitize_textarea_field($_POST['job_description']) : '';

    if (empty($target_role) || empty($job_description)) {
        wp_send_json_error('Target role and job description are required');
    }

    // Check file type
    $file_type = strtolower(pathinfo($_FILES['cv_file']['name'], PATHINFO_EXTENSION));
    if (!in_array($file_type, ['pdf', 'docx'])) {
        wp_send_json_error('Only PDF and DOCX files are supported');
    }

    // Process the CV file (for public demo with limitations)
    try {
        // Get file content (simulate CV transformation)
        $original_content = 'Original CV content would be extracted here';

        // Create a more limited transformed content for public demo
        $transformed_content = "DEMO TRANSFORMED CV FOR: {$target_role}\n\n";
        $transformed_content .= "This is a limited public demo of our CV transformation service.\n";
        $transformed_content .= "For full functionality, please sign up for a subscription.\n\n";
        $transformed_content .= "PROFESSIONAL SUMMARY\n";
        $transformed_content .= "Experienced professional with expertise relevant to the {$target_role} position. " .
                               "Proven track record of success in delivering projects and exceeding expectations.\n\n";
        $transformed_content .= "WORK EXPERIENCE\n";
        $transformed_content .= "[Full work experience transformation available with subscription]\n\n";
        $transformed_content .= "SKILLS\n";
        $transformed_content .= "- Programming languages relevant to {$target_role}\n";
        $transformed_content .= "- Project management\n";
        $transformed_content .= "- Team leadership\n";

        // Generate limited feedback
        $feedback = [
            'strengths' => [
                'Strong technical skills relevant to the role',
                'Clear presentation format',
            ],
            'weaknesses' => [
                'Limited customization in public demo',
                'Full analysis requires subscription',
            ],
            'suggestions' => [
                'Sign up for full CV transformation service',
                'Consider adding more specific achievements',
            ],
        ];

        // Calculate match score (capped at 70 for public demo)
        $score = mt_rand(60, 70);

        // Create temporary session data for the transformation
        $transformation_id = md5(time() . $target_role . rand(1000, 9999));
        set_transient('public_cv_' . $transformation_id, [
            'transformed_content' => $transformed_content,
            'score' => $score,
            'feedback' => $feedback,
            'created_at' => time(),
        ], 3600); // Expire after 1 hour

        wp_send_json_success([
            'id' => $transformation_id,
            'transformed_content' => $transformed_content,
            'score' => $score,
            'feedback' => $feedback,
        ]);

    } catch (Exception $e) {
        wp_send_json_error($e->getMessage());
    }
}
add_action('wp_ajax_nopriv_cvtransformer_process_public_cv_transformation', 'cvtransformer_process_public_cv_transformation');
add_action('wp_ajax_cvtransformer_process_public_cv_transformation', 'cvtransformer_process_public_cv_transformation');

/**
 * Get Public CV Content
 * AJAX handler for retrieving public transformation content
 */
function cvtransformer_get_public_cv_content() {
    // Check nonce
    if (!isset($_GET['nonce']) || !wp_verify_nonce($_GET['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Get transformation ID
    $transformation_id = isset($_GET['id']) ? sanitize_text_field($_GET['id']) : '';

    if (empty($transformation_id)) {
        wp_send_json_error('Transformation ID is required');
    }

    // Get transformation data from transient
    $transformation_data = get_transient('public_cv_' . $transformation_id);

    if (!$transformation_data) {
        wp_send_json_error('Transformation not found or expired');
    }

    wp_send_json_success($transformation_data['transformed_content']);
}
add_action('wp_ajax_nopriv_cvtransformer_get_public_cv_content', 'cvtransformer_get_public_cv_content');
add_action('wp_ajax_cvtransformer_get_public_cv_content', 'cvtransformer_get_public_cv_content');

/**
 * Pro Feature: Analyze Interviewer
 * AJAX handler for analyzing interviewer details
 */
function cvtransformer_analyze_interviewer() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error('User not authenticated');
    }

    // Get current user
    $user_id = get_current_user_id();

    // Check subscription status
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';

    if ($subscription_status !== 'active' || !$is_pro) {
        wp_send_json_error('Pro subscription required');
    }

    // Get form data
    $interviewer_name = isset($_POST['interviewer_name']) ? sanitize_text_field($_POST['interviewer_name']) : '';
    $interviewer_role = isset($_POST['interviewer_role']) ? sanitize_text_field($_POST['interviewer_role']) : '';
    $organization_name = isset($_POST['organization_name']) ? sanitize_text_field($_POST['organization_name']) : '';

    if (empty($interviewer_name) || empty($organization_name)) {
        wp_send_json_error('Interviewer name and organization are required');
    }

    // Simulate interviewer analysis (in a real implementation, this would use an AI service)
    $mock_insights = [
        'background' => [
            "Has been with {$organization_name} for 5+ years",
            "Previously worked at a major competitor",
            "MBA from a prestigious business school",
            "Known for asking detailed technical questions",
        ],
        'expertise' => [
            "Technical leadership",
            "Agile methodologies",
            "System architecture",
            "Performance optimization",
        ],
        'recentActivity' => [
            "Recently spoke at an industry conference about AI",
            "Published an article on LinkedIn about team management",
            "Contributed to an open-source project",
            "Mentioned interest in innovative solutions during a recent interview",
        ],
        'commonInterests' => [
            "Technology trends",
            "Process improvement",
            "Team leadership",
            "Industry best practices",
        ],
    ];

    // Save the analysis
    $post_id = wp_insert_post([
        'post_title' => "Interviewer Analysis - {$interviewer_name} - " . current_time('mysql'),
        'post_type' => 'interviewer_insight',
        'post_status' => 'private',
        'post_author' => $user_id,
    ]);

    if (!is_wp_error($post_id)) {
        update_post_meta($post_id, '_interviewer_name', $interviewer_name);
        update_post_meta($post_id, '_interviewer_role', $interviewer_role);
        update_post_meta($post_id, '_organization_name', $organization_name);
        update_post_meta($post_id, '_insights', $mock_insights);
    }

    wp_send_json_success([
        'insights' => $mock_insights
    ]);
}
add_action('wp_ajax_cvtransformer_analyze_interviewer', 'cvtransformer_analyze_interviewer');

/**
 * Pro Feature: Analyze Organization
 * AJAX handler for analyzing organization details
 */
function cvtransformer_analyze_organization() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        wp_send_json_error('Invalid nonce');
    }

    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error('User not authenticated');
    }

    // Get current user
    $user_id = get_current_user_id();

    // Check subscription status
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';

    if ($subscription_status !== 'active' || !$is_pro) {
        wp_send_json_error('Pro subscription required');
    }

    // Get form data
    $organization_name = isset($_POST['organization_name']) ? sanitize_text_field($_POST['organization_name']) : '';
    $website = isset($_POST['website']) ? esc_url_raw($_POST['website']) : '';

    if (empty($organization_name)) {
        wp_send_json_error('Organization name is required');
    }

    // Simulate organization analysis (in a real implementation, this would use an AI service)
    $mock_analysis = [
        'industryPosition' => "Leading provider of software solutions in the finance sector, with a growing presence in healthcare technology.",
        'competitors' => [
            "FinTech Solutions Inc.",
            "GlobalSoft Technologies",
            "InnovateSystems Ltd.",
            "TechVanguard Corp."
        ],
        'recentDevelopments' => [
            "Recently expanded operations to APAC region",
            "Launched new machine learning division",
            "Acquired a smaller competitor specializing in mobile applications",
            "Announced partnership with major cloud provider"
        ],
        'culture' => [
            "Known for promoting work-life balance",
            "Emphasis on continuous learning",
            "Collaborative team environment",
            "Regular hackathons and innovation challenges"
        ],
        'techStack' => [
            "Java/Spring for backend systems",
            "React for frontend applications",
            "AWS cloud infrastructure",
            "PostgreSQL databases",
            "Kubernetes for container orchestration"
        ]
    ];

    // Save the analysis
    $post_id = wp_insert_post([
        'post_title' => "Organization Analysis - {$organization_name} - " . current_time('mysql'),
        'post_type' => 'organization_analysis',
        'post_status' => 'private',
        'post_author' => $user_id,
    ]);

    if (!is_wp_error($post_id)) {
        update_post_meta($post_id, '_organization_name', $organization_name);
        update_post_meta($post_id, '_website', $website);
        update_post_meta($post_id, '_analysis', $mock_analysis);
    }

    wp_send_json_success([
        'analysis' => $mock_analysis
    ]);
}
add_action('wp_ajax_cvtransformer_analyze_organization', 'cvtransformer_analyze_organization');

/**
 * Email Verification Redirection to Payment
 * 
 * This functions modifies the default login behavior to:
 * 1. Redirect users to payment page after email verification
 * 2. Check subscription status on login
 * 3. Enforce subscription requirements
 */

// Add custom verification endpoint
add_action('init', function() {
    add_rewrite_rule(
        'verify-email/([^/]+)/?$',
        'index.php?verify_token=$matches[1]',
        'top'
    );
});

add_filter('query_vars', function($vars) {
    $vars[] = 'verify_token';
    return $vars;
});

// Process verification and redirect to payment
add_action('template_redirect', function() {
    $verify_token = get_query_var('verify_token');

    if (!empty($verify_token)) {
        // Find user with this token
        $users = get_users([
            'meta_key' => '_email_verification_token',
            'meta_value' => $verify_token,
            'number' => 1,
        ]);

        if (empty($users)) {
            wp_redirect(home_url('/login/?verification=invalid'));
            exit;
        }

        $user = $users[0];
        $expiry = get_user_meta($user->ID, '_email_verification_expiry', true);

        // Check if token has expired
        if (!empty($expiry) && time() > strtotime($expiry)) {
            wp_redirect(home_url('/login/?verification=expired'));
            exit;
        }

        // Mark as verified and remove token
        update_user_meta($user->ID, '_email_verified', true);
        delete_user_meta($user->ID, '_email_verification_token');
        delete_user_meta($user->ID, '_email_verification_expiry');

        // Automatically log in the user
        wp_set_auth_cookie($user->ID);

        // Redirect to payment page
        wp_redirect(home_url('/pricing/?verified=true'));
        exit;
    }
});

// Check subscription status on login
function cvtransformer_verify_subscription_on_login($user_login, $user) {
    // Check if email is verified
    $email_verified = get_user_meta($user->ID, '_email_verified', true);

    if (!$email_verified) {
        // Generate new verification token
        $token = wp_generate_password(32, false);
        $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));

        update_user_meta($user->ID, '_email_verification_token', $token);
        update_user_meta($user->ID, '_email_verification_expiry', $expiry);

        // Send verification email
        $verify_url = home_url('/verify-email/' . $token);
        $subject = __('Verify your email address', 'cvtransformer');
        $message = sprintf(
            __('Hello %s,

Please verify your email address by clicking the link below:

%s

This link will expire in 24 hours.

Thank you,
CV Transformer Team', 'cvtransformer'),
            $user->display_name,
            $verify_url
        );

        wp_mail($user->user_email, $subject, $message);

        // Redirect to verification page
        wp_redirect(home_url('/login/?verification=needed'));
        exit;
    }

    // Check subscription status
    $subscription_status = get_user_meta($user->ID, '_subscription_status', true);

    if ($subscription_status !== 'active') {
        // Set session variable to show subscription warning
        $_SESSION['subscription_required'] = true;
    }
}
add_action('wp_login', 'cvtransformer_verify_subscription_on_login', 10, 2);

// Display subscription warning
function cvtransformer_subscription_warning() {
    if (isset($_SESSION['subscription_required']) && $_SESSION['subscription_required']) {
        ?>
        <div class="subscription-warning">
            <p><?php _e('Your account requires an active subscription. Please subscribe to access all features.', 'cvtransformer'); ?></p>
            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button"><?php _e('View Plans', 'cvtransformer'); ?></a>
        </div>
        <?php
        // Clear the session variable
        unset($_SESSION['subscription_required']);
    }
}
add_action('wp_footer', 'cvtransformer_subscription_warning');

// Start session for subscription warnings
add_action('init', function() {
    if (!session_id()) {
        session_start();
    }
});

/**
 * Email Sender for Subscription Notifications
 */
function cvtransformer_send_subscription_confirmation($user_email, $username, $is_pro = false) {
    $subject = sprintf(
        __('%s Subscription Confirmation', 'cvtransformer'),
        $is_pro ? 'Pro' : 'Standard'
    );

    $message = sprintf(
        __('Hello %s,

Thank you for subscribing to the %s Plan!

You now have access to:
%s

Your subscription is active and will be billed at £%s per month.

Thank you for choosing CV Transformer!

Best regards,
CV Transformer Team', 'cvtransformer'),
        $username,
        $is_pro ? 'Pro' : 'Standard',
        $is_pro ? 
            "- Advanced CV transformation
- Detailed feedback and analysis
- Organization insights
- Interviewer analysis
- Priority support" : 
            "- CV transformation
- Basic feedback
- Keyword optimization",
        $is_pro ? '15' : '5'
    );

    return wp_mail($user_email, $subject, $message);
}

// Register hook for successful Stripe payments
add_action('wp', function() {
    if (isset($_GET['user_id']) && isset($_GET['payment']) && $_GET['payment'] === 'success') {
        $user_id = intval($_GET['user_id']);
        $user = get_userdata($user_id);

        if ($user) {
            // Get subscription details from Stripe (in real implementation)
            $is_pro = isset($_GET['plan']) && $_GET['plan'] === 'pro';

            // Update subscription status
            update_user_meta($user_id, '_subscription_status', 'active');
            update_user_meta($user_id, '_subscription_is_pro', $is_pro ? '1' : '0');

            // Send confirmation email
            cvtransformer_send_subscription_confirmation($user->user_email, $user->user_login, $is_pro);
        }
    }
});

/**
 * Stripe Webhook Handler
 */
function cvtransformer_handle_stripe_webhook() {
    $payload = @file_get_contents('php://input');
    $event = null;

    try {
        // Load Stripe PHP SDK
        require_once CVTRANSFORMER_DIR . '/includes/stripe/init.php';

        // Set your secret key
        \Stripe\Stripe::setApiKey(get_option('cvtransformer_stripe_secret_key'));

        // Parse event
        $event = \Stripe\Event::constructFrom(
            json_decode($payload, true)
        );

        // Handle specific event types
        switch ($event->type) {
            case 'checkout.session.completed':
                $session = $event->data->object;
                $user_id = intval($session->client_reference_id);

                if ($user_id) {
                    $user = get_userdata($user_id);

                    if ($user) {
                        // Get subscription details
                        $is_pro = isset($session->metadata->is_pro) && $session->metadata->is_pro === 'true';

                        // Update subscription status
                        update_user_meta($user_id, '_subscription_status', 'active');
                        update_user_meta($user_id, '_subscription_is_pro', $is_pro ? '1' : '0');
                        update_user_meta($user_id, '_stripe_customer_id', $session->customer);
                        update_user_meta($user_id, '_stripe_subscription_id', $session->subscription);

                        // Set subscription expiry (1 month from now)
                        $expiry = date('Y-m-d', strtotime('+1 month'));
                        update_user_meta($user_id, '_subscription_expiry', $expiry);

                        // Send confirmation email
                        cvtransformer_send_subscription_confirmation($user->user_email, $user->user_login, $is_pro);
                    }
                }
                break;

            case 'customer.subscription.updated':
                $subscription = $event->data->object;

                // Find user with this subscription ID
                $users = get_users([
                    'meta_key' => '_stripe_subscription_id',
                    'meta_value' => $subscription->id,
                    'number' => 1,
                ]);

                if (!empty($users)) {
                    $user = $users[0];

                    // Check if subscription was canceled
                    if ($subscription->cancel_at_period_end) {
                        update_user_meta($user->ID, '_subscription_status', 'cancelled');
                    }

                    // Check for plan change
                    $is_pro = false;

                    // In a real implementation, you would check the price ID
                    // to determine if it's the Pro plan
                    $price_id = $subscription->items->data[0]->price->id;

                    // For demonstration, we're using hardcoded price IDs
                    if ($price_id === 'price_pro' || $price_id === 'price_1QsdCqIPzZXVDbyyVqZTTL9Y') {
                        $is_pro = true;
                    }

                    update_user_meta($user->ID, '_subscription_is_pro', $is_pro ? '1' : '0');
                }
                break;

            case 'customer.subscription.deleted':
                $subscription = $event->data->object;

                // Find user with this subscription ID
                $users = get_users([
                    'meta_key' => '_stripe_subscription_id',
                    'meta_value' => $subscription->id,
                    'number' => 1,
                ]);

                if (!empty($users)) {
                    $user = $users[0];
                    update_user_meta($user->ID, '_subscription_status', 'expired');
                }
                break;
        }

        http_response_code(200);
        echo json_encode(['status' => 'success']);

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }

    exit;
}
add_action('wp_ajax_nopriv_cvtransformer_stripe_webhook', 'cvtransformer_handle_stripe_webhook');
add_action('wp_ajax_cvtransformer_stripe_webhook', 'cvtransformer_handle_stripe_webhook');

/**
 * Settings Page
 */
function cvtransformer_admin_settings_page() {
    add_menu_page(
        __('CV Transformer Settings', 'cvtransformer'),
        __('CV Settings', 'cvtransformer'),
        'manage_options',
        'cvtransformer-settings',
        'cvtransformer_settings_page_callback',
        'dashicons-admin-generic',
        50
    );
}
add_action('admin_menu', 'cvtransformer_admin_settings_page');

function cvtransformer_settings_page_callback() {
    // Save settings
    if (isset($_POST['cvtransformer_settings_nonce']) && wp_verify_nonce($_POST['cvtransformer_settings_nonce'], 'cvtransformer_save_settings')) {
        if (isset($_POST['stripe_public_key'])) {
            update_option('cvtransformer_stripe_publishable_key', sanitize_text_field($_POST['stripe_public_key']));
        }

        if (isset($_POST['stripe_secret_key'])) {
            update_option('cvtransformer_stripe_secret_key', sanitize_text_field($_POST['stripe_secret_key']));
        }

        echo '<div class="notice notice-success is-dismissible"><p>' . __('Settings saved successfully.', 'cvtransformer') . '</p></div>';
    }

    // Get current settings
    $stripe_public_key = get_option('cvtransformer_stripe_publishable_key', '');
    $stripe_secret_key = get_option('cvtransformer_stripe_secret_key', '');

    ?>
    <div class="wrap">
        <h1><?php _e('CV Transformer Settings', 'cvtransformer'); ?></h1>

        <form method="post" action="">
            <?php wp_nonce_field('cvtransformer_save_settings', 'cvtransformer_settings_nonce'); ?>

            <h2><?php _e('Stripe API Keys', 'cvtransformer'); ?></h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="stripe_public_key"><?php _e('Publishable Key', 'cvtransformer'); ?></label></th>
                    <td>
                        <input type="text" id="stripe_public_key" name="stripe_public_key" value="<?php echo esc_attr($stripe_public_key); ?>" class="regular-text">
                        <p class="description"><?php _e('Enter your Stripe Publishable Key.', 'cvtransformer'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="stripe_secret_key"><?php _e('Secret Key', 'cvtransformer'); ?></label></th>
                    <td>
                        <input type="password" id="stripe_secret_key" name="stripe_secret_key" value="<?php echo esc_attr($stripe_secret_key); ?>" class="regular-text">
                        <p class="description"><?php _e('Enter your Stripe Secret Key.', 'cvtransformer'); ?></p>
                    </td>
                </tr>
            </table>

            <h2><?php _e('Subscription Plans', 'cvtransformer'); ?></h2>
            <p><?php _e('Configure your subscription plans in the Subscription Plans section.', 'cvtransformer'); ?></p>
            <p><?php _e('Standard Plan: £5/month', 'cvtransformer'); ?></p>
            <p><?php _e('Pro Plan: £15/month', 'cvtransformer'); ?></p>

            <p class="submit">
                <input type="submit" name="submit" id="submit" class="button button-primary" value="<?php _e('Save Settings', 'cvtransformer'); ?>">
            </p>
        </form>
    </div>
    <?php
}

/**
 * Create Default Subscription Plans
 */
function cvtransformer_create_default_plans() {
    // Check if plans already exist
    $existing_plans = get_posts([
        'post_type' => 'subscription_plan',
        'posts_per_page' => -1,
    ]);

    if (empty($existing_plans)) {
        // Create Standard Plan
        $standard_plan_id = wp_insert_post([
            'post_title' => 'Standard Plan',
            'post_content' => 'Basic CV transformation features with keyword optimization.',
            'post_type' => 'subscription_plan',
            'post_status' => 'publish',
                ]);

        if (!is_wp_error($standard_plan_id)) {
            update_post_meta($standard_plan_id, '_price', 5);
            update_post_meta($standard_plan_id, '_is_pro', '0');
            update_post_meta($standard_plan_id, '_stripe_price_id', 'price_1QsdBjIPzZXVDbyymTKeUnsC');
        }

        // Create Pro Plan
        $pro_plan_id = wp_insert_post([
            'post_title' => 'Pro Plan',
            'post_content' => 'Advanced CV transformation with organization and interviewer insights.',
            'post_type' => 'subscription_plan',
            'post_status' => 'publish',
        ]);

        if (!is_wp_error($pro_plan_id)) {
            update_post_meta($pro_plan_id, '_price', 15);
            update_post_meta($pro_plan_id, '_is_pro', '1');
            update_post_meta($pro_plan_id, '_stripe_price_id', 'price_1QsdCqIPzZXVDbyyVqZTTL9Y');
        }
    }
}
add_action('admin_init', 'cvtransformer_create_default_plans');

// Add hook for trial period expiration check
add_action('wp_login', function($user_login, $user) {
    // Check if user has trial period set
    $trial_started_at = get_user_meta($user->ID, '_trial_started_at', true);

    if ($trial_started_at) {
        $trial_end_date = strtotime($trial_started_at . ' + 30 days');

        if (time() > $trial_end_date) {
            // Trial expired - check if they have a subscription
            $subscription_status = get_user_meta($user->ID, '_subscription_status', true);

            if ($subscription_status !== 'active') {
                // Set session variable to show trial expired warning
                $_SESSION['trial_expired'] = true;
            }
        }
    }
}, 10, 2);

// Display trial expired warning
function cvtransformer_trial_expired_warning() {
    if (isset($_SESSION['trial_expired']) && $_SESSION['trial_expired']) {
        ?>
        <div class="trial-expired-warning">
            <p><?php _e('Your 30-day trial period has expired. Please subscribe to continue using all features.', 'cvtransformer'); ?></p>
            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button"><?php _e('Subscribe Now', 'cvtransformer'); ?></a>
        </div>
        <?php
        // Clear the session variable
        unset($_SESSION['trial_expired']);
    }
}
add_action('wp_footer', 'cvtransformer_trial_expired_warning');

/**
 * Register activation hook to set trial periods for existing users
 */
function cvtransformer_theme_activation() {
    // Get all users
    $users = get_users();

    foreach ($users as $user) {
        // Check if trial period is already set
        $trial_started_at = get_user_meta($user->ID, '_trial_started_at', true);

        if (!$trial_started_at) {
            // Set trial start date to today
            update_user_meta($user->ID, '_trial_started_at', date('Y-m-d H:i:s'));
        }
    }
}
// Since WordPress themes don't have direct activation hooks, we'll hook into after_switch_theme
add_action('after_switch_theme', 'cvtransformer_theme_activation');

/**
 * Register hook for new user registration to set trial period
 */
add_action('user_register', function($user_id) {
    // Set trial start date to registration date
    update_user_meta($user_id, '_trial_started_at', date('Y-m-d H:i:s'));
});

/**
 * Redirect non-paying users after trial expiration
 */
add_action('template_redirect', function() {
    // Only check on protected pages
    if (is_page('cv-transform')) {
        // Check if user is logged in
        if (is_user_logged_in()) {
            $user_id = get_current_user_id();

            // Check subscription status
            $subscription_status = get_user_meta($user_id, '_subscription_status', true);

            if ($subscription_status !== 'active') {
                // Check trial period
                $trial_started_at = get_user_meta($user_id, '_trial_started_at', true);

                if ($trial_started_at) {
                    $trial_end_date = strtotime($trial_started_at . ' + 30 days');

                    if (time() > $trial_end_date) {
                        // Trial expired and no active subscription
                        wp_redirect(home_url('/pricing/?trial=expired'));
                        exit;
                    }
                } else {
                    // No trial period set, redirect to pricing
                    wp_redirect(home_url('/pricing/'));
                    exit;
                }
            }
        } else {
            // Not logged in, redirect to login
            wp_redirect(home_url('/login/'));
            exit;
        }
    }
});


//Existing functions from original file.  These are not modified in the edited snippet.
/**
 * Include required files
 */
// Load template tags
require_once CVTRANSFORMER_DIR . '/includes/template-tags.php';

// Initialize subscription handling
require_once CVTRANSFORMER_DIR . '/includes/subscription-handler.php';

// Initialize email notifications
require_once CVTRANSFORMER_DIR . '/includes/email-handler.php';

?>