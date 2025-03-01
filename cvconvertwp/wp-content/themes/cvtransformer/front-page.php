<?php
/**
 * The template for displaying the front page
 *
 * @package CVTransformer
 */

get_header();
?>

<main id="primary" class="site-main">
    <!-- Hero Section -->
    <section class="hero-section">
        <div class="container">
            <div class="hero-content">
                <h1><?php _e('Transform Your CV with AI-Powered Intelligence', 'cvtransformer'); ?></h1>
                <p class="hero-description">
                    <?php _e('Optimize your CV for specific job roles, gain career insights, and increase your chances of landing interviews with our advanced AI platform.', 'cvtransformer'); ?>
                </p>
                <div class="hero-buttons">
                    <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                        <?php _e('Get Started', 'cvtransformer'); ?>
                    </a>
                    <a href="<?php echo esc_url(home_url('/features/')); ?>" class="button button-secondary">
                        <?php _e('View Features', 'cvtransformer'); ?>
                    </a>
                </div>
            </div>
            <div class="hero-image">
                <img src="<?php echo esc_url(get_template_directory_uri()); ?>/assets/images/hero-image.svg" alt="CV Transformation">
            </div>
        </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
        <div class="container">
            <div class="section-header">
                <h2><?php _e('How It Works', 'cvtransformer'); ?></h2>
                <p><?php _e('Transform your CV in three simple steps', 'cvtransformer'); ?></p>
            </div>
            
            <div class="steps-container">
                <div class="step-card">
                    <div class="step-icon">
                        <i class="fas fa-upload"></i>
                    </div>
                    <h3><?php _e('Upload Your CV', 'cvtransformer'); ?></h3>
                    <p><?php _e('Upload your existing CV in PDF or DOCX format to our secure platform.', 'cvtransformer'); ?></p>
                </div>
                
                <div class="step-card">
                    <div class="step-icon">
                        <i class="fas fa-cogs"></i>
                    </div>
                    <h3><?php _e('AI Optimization', 'cvtransformer'); ?></h3>
                    <p><?php _e('Our AI analyzes your CV and optimizes it for your target job role and description.', 'cvtransformer'); ?></p>
                </div>
                
                <div class="step-card">
                    <div class="step-icon">
                        <i class="fas fa-download"></i>
                    </div>
                    <h3><?php _e('Download & Apply', 'cvtransformer'); ?></h3>
                    <p><?php _e('Download your transformed CV and use it to apply for your desired position.', 'cvtransformer'); ?></p>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section class="features-section">
        <div class="container">
            <div class="section-header">
                <h2><?php _e('Key Features', 'cvtransformer'); ?></h2>
                <p><?php _e('Advanced tools to boost your career prospects', 'cvtransformer'); ?></p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-medal"></i>
                    </div>
                    <h3><?php _e('Tailored Optimization', 'cvtransformer'); ?></h3>
                    <p><?php _e('Optimize your CV specifically for your target role and job description.', 'cvtransformer'); ?></p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3><?php _e('CV Score Analysis', 'cvtransformer'); ?></h3>
                    <p><?php _e('Get a detailed score and analysis of how well your CV matches the job requirements.', 'cvtransformer'); ?></p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-comments"></i>
                    </div>
                    <h3><?php _e('Personalized Feedback', 'cvtransformer'); ?></h3>
                    <p><?php _e('Receive specific feedback on strengths, weaknesses, and suggestions for improvement.', 'cvtransformer'); ?></p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-building"></i>
                    </div>
                    <h3><?php _e('Organization Insights', 'cvtransformer'); ?></h3>
                    <p><?php _e('Get valuable insights about the company and organization you\'re applying to (Pro plan).', 'cvtransformer'); ?></p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <h3><?php _e('Interviewer Analysis', 'cvtransformer'); ?></h3>
                    <p><?php _e('Analyze your potential interviewer\'s background and expertise (Pro plan).', 'cvtransformer'); ?></p>
                </div>
                
                <div class="feature-card">
                    <div class="feature-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <h3><?php _e('Transformation History', 'cvtransformer'); ?></h3>
                    <p><?php _e('Access and manage all your previous CV transformations in your account.', 'cvtransformer'); ?></p>
                </div>
            </div>
            
            <div class="features-cta">
                <a href="<?php echo esc_url(home_url('/features/')); ?>" class="button button-secondary">
                    <?php _e('View All Features', 'cvtransformer'); ?>
                </a>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section class="pricing-section">
        <div class="container">
            <div class="section-header">
                <h2><?php _e('Subscription Plans', 'cvtransformer'); ?></h2>
                <p><?php _e('Choose the plan that suits your career needs', 'cvtransformer'); ?></p>
            </div>
            
            <div class="pricing-plans">
                <div class="pricing-card">
                    <div class="pricing-header">
                        <h3 class="pricing-name"><?php _e('Free Trial', 'cvtransformer'); ?></h3>
                        <div class="pricing-price">
                            <?php _e('30', 'cvtransformer'); ?>
                            <span class="pricing-interval"><?php _e('days', 'cvtransformer'); ?></span>
                        </div>
                    </div>
                    <div class="pricing-features">
                        <ul>
                            <li><?php _e('Limited CV transformation', 'cvtransformer'); ?></li>
                            <li><?php _e('Basic keyword optimization', 'cvtransformer'); ?></li>
                            <li><?php _e('Preview of Pro features', 'cvtransformer'); ?></li>
                        </ul>
                    </div>
                    <div class="pricing-action">
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-secondary">
                            <?php _e('Start Free Trial', 'cvtransformer'); ?>
                        </a>
                    </div>
                </div>
                
                <div class="pricing-card">
                    <div class="pricing-header">
                        <h3 class="pricing-name"><?php _e('Standard Plan', 'cvtransformer'); ?></h3>
                        <div class="pricing-price">
                            £5
                            <span class="pricing-interval"><?php _e('/month', 'cvtransformer'); ?></span>
                        </div>
                    </div>
                    <div class="pricing-features">
                        <ul>
                            <li><?php _e('Unlimited CV transformations', 'cvtransformer'); ?></li>
                            <li><?php _e('Advanced keyword optimization', 'cvtransformer'); ?></li>
                            <li><?php _e('Detailed feedback and suggestions', 'cvtransformer'); ?></li>
                            <li><?php _e('CV score analysis', 'cvtransformer'); ?></li>
                            <li><?php _e('Transformation history', 'cvtransformer'); ?></li>
                        </ul>
                    </div>
                    <div class="pricing-action">
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                            <?php _e('Subscribe Now', 'cvtransformer'); ?>
                        </a>
                    </div>
                </div>
                
                <div class="pricing-card featured">
                    <div class="pricing-header">
                        <h3 class="pricing-name"><?php _e('Pro Plan', 'cvtransformer'); ?></h3>
                        <div class="pricing-price">
                            £15
                            <span class="pricing-interval"><?php _e('/month', 'cvtransformer'); ?></span>
                        </div>
                    </div>
                    <div class="pricing-features">
                        <ul>
                            <li><?php _e('All Standard plan features', 'cvtransformer'); ?></li>
                            <li><?php _e('Organization competition analysis', 'cvtransformer'); ?></li>
                            <li><?php _e('Interviewer background insights', 'cvtransformer'); ?></li>
                            <li><?php _e('Advanced scoring algorithms', 'cvtransformer'); ?></li>
                            <li><?php _e('Industry-specific optimizations', 'cvtransformer'); ?></li>
                            <li><?php _e('Priority support', 'cvtransformer'); ?></li>
                        </ul>
                    </div>
                    <div class="pricing-action">
                        <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                            <?php _e('Get Pro Access', 'cvtransformer'); ?>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section class="testimonials-section">
        <div class="container">
            <div class="section-header">
                <h2><?php _e('Success Stories', 'cvtransformer'); ?></h2>
                <p><?php _e('See how our platform has helped professionals land their dream jobs', 'cvtransformer'); ?></p>
            </div>
            
            <div class="testimonials-slider">
                <div class="testimonial-card">
                    <div class="testimonial-content">
                        <p>"Thanks to CV Transformer, I was able to optimize my CV for a senior developer role and secured interviews with 3 top tech companies within a week!"</p>
                    </div>
                    <div class="testimonial-author">
                        <div class="author-avatar">
                            <img src="<?php echo esc_url(get_template_directory_uri()); ?>/assets/images/testimonial-1.jpg" alt="John S.">
                        </div>
                        <div class="author-info">
                            <h4>John S.</h4>
                            <p>Software Developer</p>
                        </div>
                    </div>
                </div>
                
                <div class="testimonial-card">
                    <div class="testimonial-content">
                        <p>"The organization insights feature of the Pro plan helped me understand the company culture before my interview, which gave me a significant advantage."</p>
                    </div>
                    <div class="testimonial-author">
                        <div class="author-avatar">
                            <img src="<?php echo esc_url(get_template_directory_uri()); ?>/assets/images/testimonial-2.jpg" alt="Sarah M.">
                        </div>
                        <div class="author-info">
                            <h4>Sarah M.</h4>
                            <p>Marketing Manager</p>
                        </div>
                    </div>
                </div>
                
                <div class="testimonial-card">
                    <div class="testimonial-content">
                        <p>"After struggling to get callbacks for months, I used CV Transformer and immediately noticed a difference. The detailed feedback helped me highlight my most relevant skills."</p>
                    </div>
                    <div class="testimonial-author">
                        <div class="author-avatar">
                            <img src="<?php echo esc_url(get_template_directory_uri()); ?>/assets/images/testimonial-3.jpg" alt="Michael R.">
                        </div>
                        <div class="author-info">
                            <h4>Michael R.</h4>
                            <p>Project Manager</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
        <div class="container">
            <div class="cta-content">
                <h2><?php _e('Ready to Transform Your Career?', 'cvtransformer'); ?></h2>
                <p><?php _e('Join thousands of professionals who have optimized their CVs and advanced their careers with our AI-powered platform.', 'cvtransformer'); ?></p>
                <div class="cta-buttons">
                    <a href="<?php echo esc_url(home_url('/register/')); ?>" class="button button-primary">
                        <?php _e('Start Your Journey', 'cvtransformer'); ?>
                    </a>
                    <a href="<?php echo esc_url(home_url('/faq/')); ?>" class="button button-secondary">
                        <?php _e('Learn More', 'cvtransformer'); ?>
                    </a>
                </div>
            </div>
        </div>
    </section>
</main>

<?php
get_footer();
