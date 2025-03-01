<?php
/**
 * The template for displaying the footer
 *
 * @package CVTransformer
 */

?>
    </div><!-- #content -->

    <footer id="colophon" class="site-footer">
        <div class="container footer-container">
            <div class="footer-column">
                <h3><?php _e('About Us', 'cvtransformer'); ?></h3>
                <p>
                    <?php _e('CV Transformer is an AI-powered platform that helps professionals optimize their CVs for specific job roles and improve their career prospects.', 'cvtransformer'); ?>
                </p>
            </div>
            
            <div class="footer-column">
                <h3><?php _e('Quick Links', 'cvtransformer'); ?></h3>
                <?php
                wp_nav_menu(
                    array(
                        'theme_location' => 'footer',
                        'menu_id'        => 'footer-menu',
                        'container'      => false,
                        'depth'          => 1,
                        'fallback_cb'    => false,
                    )
                );
                ?>
            </div>
            
            <div class="footer-column">
                <h3><?php _e('Subscription Plans', 'cvtransformer'); ?></h3>
                <ul>
                    <li><a href="<?php echo esc_url(home_url('/pricing/')); ?>"><?php _e('Standard Plan - £5/month', 'cvtransformer'); ?></a></li>
                    <li><a href="<?php echo esc_url(home_url('/pricing/')); ?>"><?php _e('Pro Plan - £15/month', 'cvtransformer'); ?></a></li>
                </ul>
            </div>
            
            <div class="footer-column">
                <h3><?php _e('Contact Us', 'cvtransformer'); ?></h3>
                <ul>
                    <li><a href="<?php echo esc_url(home_url('/contact/')); ?>"><?php _e('Support', 'cvtransformer'); ?></a></li>
                    <li><a href="mailto:<?php echo esc_attr(get_option('admin_email')); ?>"><?php echo esc_html(get_option('admin_email')); ?></a></li>
                </ul>
                <div class="social-icons">
                    <a href="#" target="_blank"><i class="fab fa-facebook"></i></a>
                    <a href="#" target="_blank"><i class="fab fa-twitter"></i></a>
                    <a href="#" target="_blank"><i class="fab fa-linkedin"></i></a>
                </div>
            </div>
        </div>
        
        <div class="copyright">
            <div class="container">
                <p>
                    &copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?>. <?php _e('All rights reserved.', 'cvtransformer'); ?>
                </p>
            </div>
        </div>
    </footer><!-- #colophon -->
</div><!-- #page -->

<?php wp_footer(); ?>

</body>
</html>
