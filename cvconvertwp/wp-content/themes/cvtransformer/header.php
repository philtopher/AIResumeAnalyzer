<?php
/**
 * The header for our theme
 *
 * @package CVTransformer
 */

?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="profile" href="https://gmpg.org/xfn/11">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page" class="site">
    <header id="masthead" class="site-header">
        <div class="container header-container">
            <div class="site-branding">
                <?php
                if (has_custom_logo()) :
                    the_custom_logo();
                else :
                ?>
                    <a href="<?php echo esc_url(home_url('/')); ?>" class="site-logo">
                        <?php bloginfo('name'); ?>
                    </a>
                    <p class="site-description"><?php echo get_bloginfo('description', 'display'); ?></p>
                <?php endif; ?>
            </div>

            <nav id="site-navigation" class="site-navigation">
                <?php
                wp_nav_menu(
                    array(
                        'theme_location' => 'primary',
                        'menu_id'        => 'primary-menu',
                        'container'      => false,
                        'fallback_cb'    => false,
                    )
                );
                ?>
                
                <div class="nav-buttons">
                    <?php if (is_user_logged_in()) : ?>
                        <?php
                        $user_id = get_current_user_id();
                        $subscription_status = get_user_meta($user_id, '_subscription_status', true);
                        $is_pro = get_user_meta($user_id, '_subscription_is_pro', true) === '1';
                        ?>
                        <a href="<?php echo esc_url(home_url('/dashboard/')); ?>" class="button button-secondary">
                            Dashboard
                        </a>
                        <?php if ($subscription_status !== 'active') : ?>
                            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button button-primary">
                                Subscribe
                            </a>
                        <?php elseif (!$is_pro) : ?>
                            <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button button-primary">
                                Upgrade to Pro
                            </a>
                        <?php endif; ?>
                    <?php else : ?>
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-secondary">
                            Register
                        </a>
                        <a href="<?php echo esc_url(home_url('/login/')); ?>" class="button button-primary">
                            Login
                        </a>
                    <?php endif; ?>
                </div>
            </nav>
        </div>
    </header>

    <div id="content" class="site-content">
