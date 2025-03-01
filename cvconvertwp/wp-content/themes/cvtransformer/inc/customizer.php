<?php
/**
 * CV Transformer Theme Customizer
 *
 * @package CVTransformer
 */

/**
 * Add postMessage support for site title and description for the Theme Customizer.
 *
 * @param WP_Customize_Manager $wp_customize Theme Customizer object.
 */
function cvtransformer_customize_register($wp_customize) {
    $wp_customize->get_setting('blogname')->transport         = 'postMessage';
    $wp_customize->get_setting('blogdescription')->transport  = 'postMessage';

    // Primary Color
    $wp_customize->add_setting('primary_color', array(
        'default'           => '#4f46e5',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'primary_color', array(
        'label'    => __('Primary Color', 'cvtransformer'),
        'section'  => 'colors',
        'settings' => 'primary_color',
    )));

    // Secondary Color
    $wp_customize->add_setting('secondary_color', array(
        'default'           => '#818cf8',
        'sanitize_callback' => 'sanitize_hex_color',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control(new WP_Customize_Color_Control($wp_customize, 'secondary_color', array(
        'label'    => __('Secondary Color', 'cvtransformer'),
        'section'  => 'colors',
        'settings' => 'secondary_color',
    )));

    // Footer Text
    $wp_customize->add_section('footer_options', array(
        'title'    => __('Footer Options', 'cvtransformer'),
        'priority' => 120,
    ));

    $wp_customize->add_setting('footer_text', array(
        'default'           => sprintf(__('© %s CV Transformer. All rights reserved.', 'cvtransformer'), date('Y')),
        'sanitize_callback' => 'wp_kses_post',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('footer_text', array(
        'label'    => __('Footer Text', 'cvtransformer'),
        'section'  => 'footer_options',
        'type'     => 'textarea',
    ));

    // Homepage Options
    $wp_customize->add_section('homepage_options', array(
        'title'    => __('Homepage Options', 'cvtransformer'),
        'priority' => 130,
    ));

    // Hero Title
    $wp_customize->add_setting('hero_title', array(
        'default'           => __('Transform Your CV with AI', 'cvtransformer'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('hero_title', array(
        'label'    => __('Hero Title', 'cvtransformer'),
        'section'  => 'homepage_options',
        'type'     => 'text',
    ));

    // Hero Subtitle
    $wp_customize->add_setting('hero_subtitle', array(
        'default'           => __('Unlock your career potential with AI-powered CV transformation and career intelligence', 'cvtransformer'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('hero_subtitle', array(
        'label'    => __('Hero Subtitle', 'cvtransformer'),
        'section'  => 'homepage_options',
        'type'     => 'text',
    ));

    // CTA Button Text
    $wp_customize->add_setting('cta_button_text', array(
        'default'           => __('Transform Your CV Now', 'cvtransformer'),
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('cta_button_text', array(
        'label'    => __('CTA Button Text', 'cvtransformer'),
        'section'  => 'homepage_options',
        'type'     => 'text',
    ));

    // CTA Button URL
    $wp_customize->add_setting('cta_button_url', array(
        'default'           => home_url('/cv-transform/'),
        'sanitize_callback' => 'esc_url_raw',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('cta_button_url', array(
        'label'    => __('CTA Button URL', 'cvtransformer'),
        'section'  => 'homepage_options',
        'type'     => 'url',
    ));

    // Pricing Options
    $wp_customize->add_section('pricing_options', array(
        'title'    => __('Pricing Options', 'cvtransformer'),
        'priority' => 140,
    ));

    // Standard Plan Price
    $wp_customize->add_setting('standard_plan_price', array(
        'default'           => '5',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('standard_plan_price', array(
        'label'    => __('Standard Plan Price (£)', 'cvtransformer'),
        'section'  => 'pricing_options',
        'type'     => 'number',
    ));

    // Pro Plan Price
    $wp_customize->add_setting('pro_plan_price', array(
        'default'           => '15',
        'sanitize_callback' => 'sanitize_text_field',
        'transport'         => 'postMessage',
    ));

    $wp_customize->add_control('pro_plan_price', array(
        'label'    => __('Pro Plan Price (£)', 'cvtransformer'),
        'section'  => 'pricing_options',
        'type'     => 'number',
    ));
}
add_action('customize_register', 'cvtransformer_customize_register');

/**
 * Render the site title for the selective refresh partial.
 *
 * @return void
 */
function cvtransformer_customize_partial_blogname() {
    bloginfo('name');
}

/**
 * Render the site tagline for the selective refresh partial.
 *
 * @return void
 */
function cvtransformer_customize_partial_blogdescription() {
    bloginfo('description');
}

/**
 * Binds JS handlers to make Theme Customizer preview reload changes asynchronously.
 */
function cvtransformer_customize_preview_js() {
    wp_enqueue_script('cvtransformer-customizer', get_template_directory_uri() . '/assets/js/customizer.js', array('customize-preview'), CVTRANSFORMER_VERSION, true);
}
add_action('customize_preview_init', 'cvtransformer_customize_preview_js');

/**
 * Output Customizer CSS in header
 */
function cvtransformer_customizer_css() {
    ?>
    <style type="text/css">
        :root {
            --primary-color: <?php echo esc_attr(get_theme_mod('primary_color', '#4f46e5')); ?>;
            --secondary-color: <?php echo esc_attr(get_theme_mod('secondary_color', '#818cf8')); ?>;
        }
    </style>
    <?php
}
add_action('wp_head', 'cvtransformer_customizer_css');
