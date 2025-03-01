<?php
/**
 * The template for displaying 404 pages (not found)
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <section class="error-404 not-found">
            <header class="page-header">
                <h1 class="page-title"><?php esc_html_e('Oops! That page can&rsquo;t be found.', 'cvtransformer'); ?></h1>
            </header>

            <div class="page-content">
                <p><?php esc_html_e('It looks like nothing was found at this location. Maybe try a search?', 'cvtransformer'); ?></p>

                <div class="search-form-container">
                    <?php get_search_form(); ?>
                </div>

                <div class="error-suggestions">
                    <h2><?php esc_html_e('Here are some helpful links:', 'cvtransformer'); ?></h2>
                    <ul>
                        <li><a href="<?php echo esc_url(home_url('/')); ?>"><?php esc_html_e('Home', 'cvtransformer'); ?></a></li>
                        <li><a href="<?php echo esc_url(home_url('/cv-transform/')); ?>"><?php esc_html_e('CV Transformation', 'cvtransformer'); ?></a></li>
                        <li><a href="<?php echo esc_url(home_url('/pricing/')); ?>"><?php esc_html_e('Pricing', 'cvtransformer'); ?></a></li>
                        <li><a href="<?php echo esc_url(home_url('/login/')); ?>"><?php esc_html_e('Login', 'cvtransformer'); ?></a></li>
                    </ul>
                </div>
            </div>
        </section>
    </div>
</main>

<?php
get_footer();
