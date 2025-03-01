<?php
/**
 * The template for displaying single posts
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <?php
        while (have_posts()) :
            the_post();
            ?>
            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                <header class="entry-header">
                    <?php the_title('<h1 class="entry-title">', '</h1>'); ?>
                    
                    <div class="entry-meta">
                        <span class="posted-on">
                            <?php
                            printf(
                                /* translators: %s: post date. */
                                esc_html_x('Posted on %s', 'post date', 'cvtransformer'),
                                '<a href="' . esc_url(get_permalink()) . '" rel="bookmark">' . get_the_date() . '</a>'
                            );
                            ?>
                        </span>
                        
                        <span class="byline">
                            <?php
                            printf(
                                /* translators: %s: post author. */
                                esc_html_x('by %s', 'post author', 'cvtransformer'),
                                '<span class="author vcard"><a href="' . esc_url(get_author_posts_url(get_the_author_meta('ID'))) . '">' . esc_html(get_the_author()) . '</a></span>'
                            );
                            ?>
                        </span>
                    </div>
                </header>

                <?php if (has_post_thumbnail()) : ?>
                    <div class="post-thumbnail">
                        <?php the_post_thumbnail('large'); ?>
                    </div>
                <?php endif; ?>

                <div class="entry-content">
                    <?php
                    the_content(
                        sprintf(
                            /* translators: %s: Name of current post. */
                            __('Continue reading %s <span class="meta-nav">&rarr;</span>', 'cvtransformer'),
                            get_the_title()
                        )
                    );

                    wp_link_pages(
                        array(
                            'before' => '<div class="page-links">' . __('Pages:', 'cvtransformer'),
                            'after'  => '</div>',
                        )
                    );
                    ?>
                </div>

                <footer class="entry-footer">
                    <?php
                    // Display categories and tags
                    $categories_list = get_the_category_list(', ');
                    if ($categories_list) {
                        printf('<span class="cat-links">' . __('Categories: %1$s', 'cvtransformer') . '</span>', $categories_list);
                    }

                    $tags_list = get_the_tag_list('', ', ');
                    if ($tags_list) {
                        printf('<span class="tags-links">' . __('Tags: %1$s', 'cvtransformer') . '</span>', $tags_list);
                    }
                    ?>
                </footer>
            </article>

            <?php
            // If comments are open or we have at least one comment, load up the comment template.
            if (comments_open() || get_comments_number()) :
                comments_template();
            endif;

        endwhile; // End of the loop.
        ?>
    </div>
</main>

<?php
get_footer();
