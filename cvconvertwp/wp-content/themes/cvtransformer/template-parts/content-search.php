<?php
/**
 * Template part for displaying results in search pages
 *
 * @package CVTransformer
 */
?>

<article id="post-<?php the_ID(); ?>" <?php post_class('card'); ?>>
    <div class="card-content">
        <header class="entry-header">
            <?php the_title(sprintf('<h2 class="entry-title card-title"><a href="%s" rel="bookmark">', esc_url(get_permalink())), '</a></h2>'); ?>

            <?php if ('post' === get_post_type()) : ?>
                <div class="entry-meta">
                    <span class="posted-on">
                        <?php echo get_the_date(); ?>
                    </span>
                </div>
            <?php endif; ?>
        </header>

        <div class="entry-summary">
            <?php the_excerpt(); ?>
        </div>

        <footer class="entry-footer">
            <a href="<?php the_permalink(); ?>" class="button button-secondary">
                <?php _e('Read More', 'cvtransformer'); ?>
            </a>
        </footer>
    </div>
</article>
