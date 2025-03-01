<?php
/**
 * The template for displaying search results pages
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <?php if (have_posts()) : ?>
            <header class="page-header">
                <h1 class="page-title">
                    <?php
                    /* translators: %s: search query. */
                    printf(esc_html__('Search Results for: %s', 'cvtransformer'), '<span>' . get_search_query() . '</span>');
                    ?>
                </h1>
            </header>

            <div class="posts-grid">
                <?php
                while (have_posts()) :
                    the_post();
                    get_template_part('template-parts/content', 'search');
                endwhile;
                ?>
            </div>

            <?php
            the_posts_pagination(array(
                'prev_text' => __('Previous', 'cvtransformer'),
                'next_text' => __('Next', 'cvtransformer'),
            ));
            ?>

        <?php else : ?>
            <section class="no-results not-found">
                <header class="page-header">
                    <h1 class="page-title"><?php esc_html_e('Nothing Found', 'cvtransformer'); ?></h1>
                </header>

                <div class="page-content">
                    <?php if (is_search()) : ?>
                        <p><?php esc_html_e('Sorry, but nothing matched your search terms. Please try again with some different keywords.', 'cvtransformer'); ?></p>
                        <?php get_search_form(); ?>
                    <?php else : ?>
                        <p><?php esc_html_e('It seems we can&rsquo;t find what you&rsquo;re looking for. Perhaps searching can help.', 'cvtransformer'); ?></p>
                        <?php get_search_form(); ?>
                    <?php endif; ?>
                </div>
            </section>
        <?php endif; ?>
    </div>
</main>

<?php
get_footer();
