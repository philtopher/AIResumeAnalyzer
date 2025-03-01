<?php
/**
 * The template for displaying WooCommerce pages
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main woocommerce-main">
    <div class="container">
        <?php woocommerce_content(); ?>
    </div>
</main>

<?php
get_footer();
