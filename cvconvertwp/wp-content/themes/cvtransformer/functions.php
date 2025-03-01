<?php
/**
 * CVTransformer functions and definitions
 *
 * @package CVTransformer
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define theme constants
define('CVTRANSFORMER_VERSION', '1.0.0');
define('CVTRANSFORMER_DIR', get_template_directory());
define('CVTRANSFORMER_URI', get_template_directory_uri());

/**
 * Include required theme files
 */
require_once CVTRANSFORMER_DIR . '/inc/customizer.php';
require_once CVTRANSFORMER_DIR . '/inc/plugin-compatibility.php'; // Include plugin compatibility functions

/**
 * Sets up theme defaults and registers support for various WordPress features.
 */
function cvtransformer_setup() {
    // Load theme text domain for translation
    load_theme_textdomain('cvtransformer', CVTRANSFORMER_DIR . '/languages');

    // Add default posts and comments RSS feed links to head
    add_theme_support('automatic-feed-links');

    // Let WordPress manage the document title
    add_theme_support('title-tag');

    // Enable support for Post Thumbnails on posts and pages
    add_theme_support('post-thumbnails');

    // This theme uses wp_nav_menu() in one location.
    register_nav_menus(array(
        'primary' => esc_html__('Primary Menu', 'cvtransformer'),
        'footer' => esc_html__('Footer Menu', 'cvtransformer'),
    ));

    // Switch default core markup to output valid HTML5
    add_theme_support('html5', array(
        'search-form',
        'comment-form',
        'comment-list',
        'gallery',
        'caption',
    ));

    // Add theme support for selective refresh for widgets.
    add_theme_support('customize-selective-refresh-widgets');

    // Add support for core custom logo
    add_theme_support('custom-logo', array(
        'height' => 250,
        'width' => 250,
        'flex-width' => true,
        'flex-height' => true,
    ));

    // Add support for responsive embeds.
    add_theme_support('responsive-embeds');

    // Add WooCommerce support
    add_theme_support('woocommerce');
    add_theme_support('wc-product-gallery-zoom');
    add_theme_support('wc-product-gallery-lightbox');
    add_theme_support('wc-product-gallery-slider');

    // Add Elementor support
    add_theme_support('elementor');
}
add_action('after_setup_theme', 'cvtransformer_setup');

/**
 * Register widget area.
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
            'name'          => esc_html__('Footer ' . $i, 'cvtransformer'),
            'id'            => 'footer-' . $i,
            'description'   => esc_html__('Add footer widgets here.', 'cvtransformer'),
            'before_widget' => '<div id="%1$s" class="widget %2$s">',
            'after_widget'  => '</div>',
            'before_title'  => '<h3 class="widget-title">',
            'after_title'   => '</h3>',
        ));
    }

    // WooCommerce shop sidebar
    if (class_exists('WooCommerce')) {
        register_sidebar(array(
            'name'          => esc_html__('Shop Sidebar', 'cvtransformer'),
            'id'            => 'shop-sidebar',
            'description'   => esc_html__('Appears on WooCommerce shop pages.', 'cvtransformer'),
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
    // Enqueue styles
    wp_enqueue_style('cvtransformer-style', get_stylesheet_uri(), array(), CVTRANSFORMER_VERSION);
    wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css', array(), '5.15.3');
    wp_enqueue_style('google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap', array(), CVTRANSFORMER_VERSION);

    // Enqueue scripts
    wp_enqueue_script('cvtransformer-navigation', CVTRANSFORMER_URI . '/assets/js/main.js', array('jquery'), CVTRANSFORMER_VERSION, true);

    // Stripe integration
    if (is_page('pricing') || is_page('account')) {
        wp_enqueue_script('cvtransformer-stripe', CVTRANSFORMER_URI . '/assets/js/stripe-integration.js', array('jquery'), CVTRANSFORMER_VERSION, true);
        wp_localize_script('cvtransformer-stripe', 'stripe_params', array(
            'publishable_key' => get_option('cvtransformer_stripe_publishable_key'),
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('cvtransformer_nonce'),
        ));
    }

    // Localize script with AJAX URL for all pages
    wp_localize_script('cvtransformer-navigation', 'cvtransformer_params', array(
        'ajax_url' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('cvtransformer_nonce'),
    ));

    // Elementor compatibility
    if (class_exists('\Elementor\Plugin')) {
        wp_enqueue_style('cvtransformer-elementor', CVTRANSFORMER_URI . '/assets/css/elementor.css', array(), CVTRANSFORMER_VERSION);
    }
}
add_action('wp_enqueue_scripts', 'cvtransformer_scripts');

/**
 * Register Custom Post Types
 */
function cvtransformer_register_post_types() {
    // CV Transformation Post Type
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

    // Subscription Plan Post Type
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
 * Process CV Transformation
 * AJAX handler for transforming uploaded CV
 */
function cvtransformer_process_cv_transformation() {
    // Add logging for debugging
    error_log('CV Transformation AJAX request received');

    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        error_log('CV Transformation: Invalid nonce');
        wp_send_json_error('Invalid security token. Please refresh the page and try again.');
        return;
    }

    // Check if user has premium access using our compatibility function
    // This will check Paid Membership Pro first if installed, then default to our subscription system
    if (!cvtransformer_check_premium_access('cv_transform')) {
        error_log('CV Transformation: No premium access');
        wp_send_json_error('You need premium access to use this feature. Please subscribe to a plan.');
        return;
    }

    // Get current user
    $user_id = get_current_user_id();

    // Debug uploaded files
    error_log('CV Transformation: FILES data: ' . print_r($_FILES, true));

    // Check file upload
    if (empty($_FILES['cv_file']) || $_FILES['cv_file']['error'] !== UPLOAD_ERR_OK) {
        $error_message = 'File upload failed. ';
        if (!empty($_FILES['cv_file']['error'])) {
            $error_message .= 'Error code: ' . $_FILES['cv_file']['error'];
        } else {
            $error_message .= 'No file was uploaded.';
        }
        error_log('CV Transformation: ' . $error_message);
        wp_send_json_error($error_message);
        return;
    }

    // Get form data
    $target_role = isset($_POST['target_role']) ? sanitize_text_field($_POST['target_role']) : '';
    $job_description = isset($_POST['job_description']) ? sanitize_textarea_field($_POST['job_description']) : '';

    error_log('CV Transformation: Target role: ' . $target_role);
    error_log('CV Transformation: Job description length: ' . strlen($job_description));

    if (empty($target_role) || empty($job_description)) {
        error_log('CV Transformation: Missing form data');
        wp_send_json_error('Target role and job description are required. Please complete all fields.');
        return;
    }

    // Check file type
    $file_type = strtolower(pathinfo($_FILES['cv_file']['name'], PATHINFO_EXTENSION));
    if (!in_array($file_type, ['pdf', 'docx'])) {
        error_log('CV Transformation: Invalid file type: ' . $file_type);
        wp_send_json_error('Only PDF and DOCX files are supported. Please upload a file in one of these formats.');
        return;
    }

    // Process the CV file
    try {
        // Create uploads directory if it doesn't exist
        $upload_dir = wp_upload_dir();
        $cv_dir = $upload_dir['basedir'] . '/cv_transformer';

        if (!file_exists($cv_dir)) {
            wp_mkdir_p($cv_dir);
        }

        // Move uploaded file to temporary location
        $temp_file = $cv_dir . '/' . uniqid('cv_') . '.' . $file_type;
        if (!move_uploaded_file($_FILES['cv_file']['tmp_name'], $temp_file)) {
            error_log('CV Transformation: Failed to move uploaded file');
            wp_send_json_error('Failed to process uploaded file. Please try again.');
            return;
        }

        error_log('CV Transformation: File moved to: ' . $temp_file);

        // Get file content (simulate CV transformation)
        // In a real implementation, you would extract text and process the CV here
        $original_content = 'Original CV content would be extracted here';

        // For demonstration, we'll create a simulated transformed content
        $transformed_content = "TRANSFORMED CV FOR: {$target_role}\n\n";
        $transformed_content .= "CONTACT INFORMATION\n";
        $transformed_content .= "John Doe\n";
        $transformed_content .= "Email: john.doe@example.com\n";
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
            'post_author' => $user_id,
        ]);

        if (is_wp_error($post_id)) {
            error_log('CV Transformation: Error creating post: ' . $post_id->get_error_message());
            wp_send_json_error('Failed to save transformation record. Please try again.');
            return;
        }

        // Save meta data
        update_post_meta($post_id, '_user_id', $user_id);
        update_post_meta($post_id, '_original_content', $original_content);
        update_post_meta($post_id, '_transformed_content', $transformed_content);
        update_post_meta($post_id, '_target_role', $target_role);
        update_post_meta($post_id, '_job_description', $job_description);
        update_post_meta($post_id, '_score', $score);
        update_post_meta($post_id, '_feedback', $feedback);

        // Clean up temporary file
        @unlink($temp_file);

        error_log('CV Transformation: Successful transformation, post ID: ' . $post_id);

        // Return success response
        wp_send_json_success([
            'id' => $post_id,
            'transformed_content' => $transformed_content,
            'score' => $score,
            'feedback' => $feedback,
        ]);

    } catch (Exception $e) {
        error_log('CV Transformation: Exception: ' . $e->getMessage());
        wp_send_json_error('An error occurred during transformation: ' . $e->getMessage());
    }
}
add_action('wp_ajax_cvtransformer_process_cv_transformation', 'cvtransformer_process_cv_transformation');

/**
 * Pro Feature: Analyze Organization
 * AJAX handler for analyzing organization details
 */
function cvtransformer_analyze_organization() {
    // Add logging for debugging
    error_log('Analyze Organization request received');

    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        error_log('Analyze Organization: Invalid nonce');
        wp_send_json_error('Invalid security token. Please refresh the page and try again.');
        return;
    }

    // Check if user has pro access using our compatibility function
    if (!cvtransformer_check_premium_access('pro_features')) {
        error_log('Analyze Organization: Pro access required');
        wp_send_json_error('This feature requires Pro access. Please upgrade your plan.');
        return;
    }

    // Get current user
    $user_id = get_current_user_id();

    // Get form data
    $organization_name = isset($_POST['organization_name']) ? sanitize_text_field($_POST['organization_name']) : '';
    $website = isset($_POST['website']) ? esc_url_raw($_POST['website']) : '';

    if (empty($organization_name)) {
        error_log('Analyze Organization: Organization name missing');
        wp_send_json_error('Organization name is required.');
        return;
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
        'post_type' => 'organization_insight',
        'post_status' => 'private',
        'post_author' => $user_id,
    ]);

    if (!is_wp_error($post_id)) {
        update_post_meta($post_id, '_organization_name', $organization_name);
        update_post_meta($post_id, '_website', $website);
        update_post_meta($post_id, '_analysis', $mock_analysis);
    }

    error_log('Analyze Organization: Success for ' . $organization_name);

    wp_send_json_success([
        'analysis' => $mock_analysis
    ]);
}
add_action('wp_ajax_cvtransformer_analyze_organization', 'cvtransformer_analyze_organization');

/**
 * Pro Feature: Analyze Interviewer
 * AJAX handler for analyzing interviewer details
 */
function cvtransformer_analyze_interviewer() {
    // Add logging for debugging
    error_log('Analyze Interviewer request received');

    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'cvtransformer_nonce')) {
        error_log('Analyze Interviewer: Invalid nonce');
        wp_send_json_error('Invalid security token. Please refresh the page and try again.');
        return;
    }

    // Check if user has pro access using our compatibility function
    if (!cvtransformer_check_premium_access('pro_features')) {
        error_log('Analyze Interviewer: Pro access required');
        wp_send_json_error('This feature requires Pro access. Please upgrade your plan.');
        return;
    }

    // Get current user
    $user_id = get_current_user_id();

    // Get form data
    $interviewer_name = isset($_POST['interviewer_name']) ? sanitize_text_field($_POST['interviewer_name']) : '';
    $interviewer_role = isset($_POST['interviewer_role']) ? sanitize_text_field($_POST['interviewer_role']) : '';
    $organization_name = isset($_POST['organization_name']) ? sanitize_text_field($_POST['organization_name']) : '';

    if (empty($interviewer_name) || empty($organization_name)) {
        error_log('Analyze Interviewer: Missing required fields');
        wp_send_json_error('Interviewer name and organization are required.');
        return;
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

    error_log('Analyze Interviewer: Success for ' . $interviewer_name);

    wp_send_json_success([
        'insights' => $mock_insights
    ]);
}
add_action('wp_ajax_cvtransformer_analyze_interviewer', 'cvtransformer_analyze_interviewer');

/**
 * WooCommerce Integration Functions
 */
if (class_exists('WooCommerce')) {
    // Remove default WooCommerce styles
    add_filter('woocommerce_enqueue_styles', '__return_empty_array');

    // Add custom WooCommerce styles
    function cvtransformer_woocommerce_scripts() {
        wp_enqueue_style('cvtransformer-woocommerce', CVTRANSFORMER_URI . '/assets/css/woocommerce.css', array(), CVTRANSFORMER_VERSION);
    }
    add_action('wp_enqueue_scripts', 'cvtransformer_woocommerce_scripts');

    // Custom number of products per page
    function cvtransformer_woocommerce_products_per_page() {
        return 12;
    }
    add_filter('loop_shop_per_page', 'cvtransformer_woocommerce_products_per_page');

    // Override WooCommerce templates
    function cvtransformer_woocommerce_template_path() {
        return 'woocommerce/';
    }
    add_filter('woocommerce_template_path', 'cvtransformer_woocommerce_template_path');
}

/**
 * Mailchimp Integration Helper Functions
 */
function cvtransformer_mailchimp_subscribe($email, $fname = '', $lname = '') {
    // This is a helper function that can be used if the site has Mailchimp for WP plugin
    // It allows subscription to be triggered programmatically
    if (function_exists('mc4wp_add_subscriber')) {
        $subscriber_data = [
            'email_address' => $email,
        ];

        if (!empty($fname)) {
            $subscriber_data['merge_fields']['FNAME'] = $fname;
        }

        if (!empty($lname)) {
            $subscriber_data['merge_fields']['LNAME'] = $lname;
        }

        $result = mc4wp_add_subscriber($subscriber_data);
        return $result;
    }
    return false;
}

/**
 * SMTP Email Configuration
 * Allow the theme to use the server's SMTP configuration
 */
function cvtransformer_smtp_email_configuration($phpmailer) {
    // Get SMTP settings from options
    $smtp_host = get_option('smtp_host', '');
    $smtp_port = get_option('smtp_port', 587);
    $smtp_username = get_option('smtp_username', '');
    $smtp_password = get_option('smtp_password', '');
    $smtp_encryption = get_option('smtp_encryption', 'tls');
    $from_email = get_option('from_email', get_option('admin_email'));
    $from_name = get_option('from_name', get_option('blogname'));

    // Only configure if SMTP settings are provided
    if (!empty($smtp_host) && !empty($smtp_username) && !empty($smtp_password)) {
        $phpmailer->isSMTP();
        $phpmailer->Host = $smtp_host;
        $phpmailer->SMTPAuth = true;
        $phpmailer->Port = $smtp_port;
        $phpmailer->Username = $smtp_username;
        $phpmailer->Password = $smtp_password;
        $phpmailer->SMTPSecure = $smtp_encryption;
        $phpmailer->From = $from_email;
        $phpmailer->FromName = $from_name;
    }
}
add_action('phpmailer_init', 'cvtransformer_smtp_email_configuration');

/**
 * SMTP Settings Page
 */
function cvtransformer_add_smtp_settings_page() {
    add_options_page(
        'SMTP Settings',
        'SMTP Settings',
        'manage_options',
        'cvtransformer-smtp-settings',
        'cvtransformer_smtp_settings_page_html'
    );
}
add_action('admin_menu', 'cvtransformer_add_smtp_settings_page');

function cvtransformer_smtp_settings_page_html() {
    // Check user capabilities
    if (!current_user_can('manage_options')) {
        return;
    }

    // Save settings if form is submitted
    if (isset($_POST['cvtransformer_smtp_save'])) {
        check_admin_referer('cvtransformer_smtp_settings');

        update_option('smtp_host', sanitize_text_field($_POST['smtp_host']));
        update_option('smtp_port', intval($_POST['smtp_port']));
        update_option('smtp_username', sanitize_text_field($_POST['smtp_username']));

        if (!empty($_POST['smtp_password'])) {
            update_option('smtp_password', sanitize_text_field($_POST['smtp_password']));
        }

        update_option('smtp_encryption', sanitize_text_field($_POST['smtp_encryption']));
        update_option('from_email', sanitize_email($_POST['from_email']));
        update_option('from_name', sanitize_text_field($_POST['from_name']));

        echo '<div class="notice notice-success is-dismissible"><p>Settings saved.</p></div>';
    }

    // Get current settings
    $smtp_host = get_option('smtp_host', '');
    $smtp_port = get_option('smtp_port', 587);
    $smtp_username = get_option('smtp_username', '');
    $smtp_password = get_option('smtp_password', '');
    $smtp_encryption = get_option('smtp_encryption', 'tls');
    $from_email = get_option('from_email', get_option('admin_email'));
    $from_name = get_option('from_name', get_option('blogname'));

    ?>
    <div class="wrap">
        <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
        <form method="post">
            <?php wp_nonce_field('cvtransformer_smtp_settings'); ?>
            <table class="form-table">
                <tr>
                    <th scope="row"><label for="smtp_host">SMTP Host</label></th>
                    <td>
                        <input type="text" name="smtp_host" id="smtp_host" value="<?php echo esc_attr($smtp_host); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="smtp_port">SMTP Port</label></th>
                    <td>
                        <input type="number" name="smtp_port" id="smtp_port" value="<?php echo esc_attr($smtp_port); ?>" class="small-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="smtp_username">SMTP Username</label></th>
                    <td>
                        <input type="text" name="smtp_username" id="smtp_username" value="<?php echo esc_attr($smtp_username); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="smtp_password">SMTP Password</label></th>
                    <td>
                        <input type="password" name="smtp_password" id="smtp_password" value="" class="regular-text" placeholder="Leave blank to keep existing password">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="smtp_encryption">Encryption</label></th>
                    <td>
                        <select name="smtp_encryption" id="smtp_encryption">
                            <option value="none" <?php selected($smtp_encryption, 'none'); ?>>None</option>
                            <option value="tls" <?php selected($smtp_encryption, 'tls'); ?>>TLS</option>
                            <option value="ssl" <?php selected($smtp_encryption, 'ssl'); ?>>SSL</option>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="from_email">From Email</label></th>
                    <td>
                        <input type="email" name="from_email" id="from_email" value="<?php echo esc_attr($from_email); ?>" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="from_name">From Name</label></th>
                    <td>
                        <input type="text" name="from_name" id="from_name" value="<?php echo esc_attr($from_name); ?>" class="regular-text">
                    </td>
                </tr>
            </table>
            <p class="submit">
                <input type="submit" name="cvtransformer_smtp_save" class="button button-primary" value="Save Settings">
            </p>
        </form>
    </div>
    <?php
}

/**
 * Ensure theme is compatible with security plugins
 */
function cvtransformer_security_plugin_compatibility() {
    // Ensure compatibility with Ninja Firewall
    if (class_exists('NinjaFirewall')) {
        // Add our AJAX endpoints to Ninja Firewall's exceptions if needed
        add_filter('nfw_excluded_urls', function($urls) {
            $urls[] = 'wp-admin/admin-ajax.php';
            return $urls;
        });
    }

    // Ensure compatibility with Loginizer
    if (class_exists('Loginizer')) {
        // Add our custom login endpoints to Loginizer's exceptions if needed
        add_filter('loginizer_whitelist_ips', function($ips) {
            // This is where we would add exceptions if needed
            return $ips;
        });
    }
}
add_action('init', 'cvtransformer_security_plugin_compatibility');

/**
 * Add custom template loader for Elementor compatibility
 */
function cvtransformer_elementor_compatibility() {
    if (class_exists('\Elementor\Plugin')) {
        if (!class_exists('Elementor_Theme_Compatibility')) {
            class Elementor_Theme_Compatibility {
                public function __construct() {
                    add_action('elementor/theme/register_locations', array($this, 'register_locations'));
                }

                public function register_locations($elementor_theme_manager) {
                    $elementor_theme_manager->register_location('header');
                    $elementor_theme_manager->register_location('footer');
                    $elementor_theme_manager->register_location('single');
                    $elementor_theme_manager->register_location('archive');
                }
            }

            new Elementor_Theme_Compatibility();
        }
    }
}
add_action('after_setup_theme', 'cvtransformer_elementor_compatibility');

/**
 * Include required files
 */
// Load template tags
require_once CVTRANSFORMER_DIR . '/includes/template-tags.php';

// Initialize subscription handling
require_once CVTRANSFORMER_DIR . '/includes/subscription-handler.php';

// Initialize email notifications
require_once CVTRANSFORMER_DIR . '/includes/email-handler.php';

/**
 * Create default subscription plans if they don't exist
 */
function cvtransformer_create_default_subscription_plans() {
    // Check if we've already created plans
    if (get_option('cvtransformer_plans_created')) {
        return;
    }

    // Get standard plan prices from customizer
    $standard_price = get_theme_mod('standard_plan_price', 5);
    $pro_price = get_theme_mod('pro_plan_price', 15);

    // Create Standard plan
    $standard_plan_id = wp_insert_post([
        'post_title' => 'Standard Plan',
        'post_content' => 'Basic CV transformation features with keyword optimization.',
        'post_type' => 'subscription_plan',
        'post_status' => 'publish',
    ]);

    if (!is_wp_error($standard_plan_id)) {
        update_post_meta($standard_plan_id, '_price', $standard_price);
        update_post_meta($standard_plan_id, '_is_pro', '0');
        update_post_meta($standard_plan_id, '_stripe_price_id', 'price_1234567890'); // Replace with actual Stripe price ID
    }

    // Create Pro plan
    $pro_plan_id = wp_insert_post([
        'post_title' => 'Pro Plan',
        'post_content' => 'Advanced CV transformation with organization and interviewer insights.',
        'post_type' => 'subscription_plan',
        'post_status' => 'publish',
    ]);

    if (!is_wp_error($pro_plan_id)) {
        update_post_meta($pro_plan_id, '_price', $pro_price);
        update_post_meta($pro_plan_id, '_is_pro', '1');
        update_post_meta($pro_plan_id, '_stripe_price_id', 'price_0987654321'); // Replace with actual Stripe price ID
    }

    // Mark as created
    update_option('cvtransformer_plans_created', 1);
}
add_action('admin_init', 'cvtransformer_create_default_subscription_plans');

/**
 * Upload directory protection
 * Prevent direct access to CV uploads directory
 */
function cvtransformer_protect_uploads() {
    $upload_dir = wp_upload_dir();
    $cv_dir = $upload_dir['basedir'] . '/cv_transformer';

    if (file_exists($cv_dir) && !file_exists($cv_dir . '/.htaccess')) {
        $htaccess_content = "# Prevent direct access to files\n";
        $htaccess_content .= "<FilesMatch \"\\.(pdf|docx|txt)\$\">\n";
        $htaccess_content .= "Order Allow,Deny\n";
        $htaccess_content .= "Deny from all\n";
        $htaccess_content .= "</FilesMatch>\n";

        @file_put_contents($cv_dir . '/.htaccess', $htaccess_content);
    }
}
add_action('admin_init', 'cvtransformer_protect_uploads');

/**
 * Add debug information to help with troubleshooting
 */
function cvtransformer_add_debug_info() {
    if (current_user_can('manage_options') && isset($_GET['cvtransformer_debug'])) {
        echo '<div style="background-color: #f8f9fa; padding: 20px; margin: 20px; border: 1px solid #ddd;">';
        echo '<h3>CVTransformer Debug Information</h3>';

        echo '<h4>WordPress Setup</h4>';
        echo '<ul>';
        echo '<li>WordPress Version: ' . get_bloginfo('version') . '</li>';
        echo '<li>Theme Version: ' . CVTRANSFORMER_VERSION . '</li>';
        echo '<li>PHP Version: ' . phpversion() . '</li>';
        echo '</ul>';

        echo '<h4>Activated Plugins</h4>';
        echo '<ul>';
        $active_plugins = get_option('active_plugins');
        foreach ($active_plugins as $plugin) {
            echo '<li>' . esc_html($plugin) . '</li>';
        }
        echo '</ul>';

        echo '<h4>Theme Settings</h4>';
        echo '<ul>';
        echo '<li>Standard Plan Price: ' . get_theme_mod('standard_plan_price', 5) . '</li>';
        echo '<li>Pro Plan Price: ' . get_theme_mod('pro_plan_price', 15) . '</li>';
        echo '</ul>';

        echo '</div>';
    }
}
add_action('wp_footer', 'cvtransformer_add_debug_info');

?>