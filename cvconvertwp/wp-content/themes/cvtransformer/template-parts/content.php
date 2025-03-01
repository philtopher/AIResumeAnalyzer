<?php
/**
 * Template part for displaying posts
 *
 * @package CVTransformer
 */
?>

<article id="post-<?php the_ID(); ?>" <?php post_class('card'); ?>>
    <?php if (has_post_thumbnail()) : ?>
        <div class="post-thumbnail">
            <a href="<?php the_permalink(); ?>">
                <?php the_post_thumbnail('medium'); ?>
            </a>
        </div>
    <?php endif; ?>

    <div class="card-content">
        <header class="entry-header">
            <?php
            if (is_singular()) :
                the_title('<h1 class="entry-title card-title">', '</h1>');
            else :
                the_title('<h2 class="entry-title card-title"><a href="' . esc_url(get_permalink()) . '" rel="bookmark">', '</a></h2>');
            endif;

            if ('post' === get_post_type()) :
                ?>
                <div class="entry-meta">
                    <span class="posted-on">
                        <?php echo get_the_date(); ?>
                    </span>
                </div>
            <?php endif; ?>
        </header>

        <div class="entry-content">
            <?php
            if (is_singular()) :
                the_content();
            else :
                the_excerpt();
                ?>
                <a href="<?php the_permalink(); ?>" class="read-more">
                    <?php _e('Read More', 'cvtransformer'); ?>
                </a>
            <?php endif; ?>
        </div>
    </div>
</article>
