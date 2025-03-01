<?php
/**
 * The main template file
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <?php
    if (is_home() && !is_front_page() && have_posts()) :
    ?>
        <header class="page-header">
            <div class="container">
                <h1 class="page-title"><?php single_post_title(); ?></h1>
            </div>
        </header>

        <div class="container">
            <div class="posts-grid">
                <?php
                while (have_posts()) :
                    the_post();
                    get_template_part('template-parts/content', get_post_type());
                endwhile;
                ?>
            </div>

            <?php
            the_posts_pagination(array(
                'prev_text' => __('Previous', 'cvtransformer'),
                'next_text' => __('Next', 'cvtransformer'),
            ));
            ?>
        </div>
    <?php
    elseif (have_posts()) :
        while (have_posts()) :
            the_post();
            get_template_part('template-parts/content', get_post_type());
        endwhile;

        the_posts_pagination(array(
            'prev_text' => __('Previous', 'cvtransformer'),
            'next_text' => __('Next', 'cvtransformer'),
        ));
    else :
        get_template_part('template-parts/content', 'none');
    endif;
    ?>
</main>

<?php
get_footer();
