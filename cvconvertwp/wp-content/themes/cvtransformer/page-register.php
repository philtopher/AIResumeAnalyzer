<?php
/**
 * Template Name: Registration Page
 *
 * @package CVTransformer
 */

// Redirect logged-in users to account page
if (is_user_logged_in()) {
    wp_redirect(home_url('/account/'));
    exit;
}

// Process registration form
$reg_error = '';
$reg_success = '';

if (isset($_POST['register_submit'])) {
    $username = sanitize_user($_POST['username']);
    $email = sanitize_email($_POST['email']);
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    
    // Form validation
    if (empty($username) || empty($email) || empty($password) || empty($confirm_password)) {
        $reg_error = __('All fields are required.', 'cvtransformer');
    } elseif (!is_email($email)) {
        $reg_error = __('Invalid email address.', 'cvtransformer');
    } elseif ($password != $confirm_password) {
        $reg_error = __('Passwords do not match.', 'cvtransformer');
    } elseif (strlen($password) < 8) {
        $reg_error = __('Password must be at least 8 characters long.', 'cvtransformer');
    } elseif (username_exists($username)) {
        $reg_error = __('This username is already taken.', 'cvtransformer');
    } elseif (email_exists($email)) {
        $reg_error = __('This email address is already registered.', 'cvtransformer');
    } else {
        // Register the user
        $user_id = wp_create_user($username, $password, $email);
        
        if (is_wp_error($user_id)) {
            $reg_error = $user_id->get_error_message();
        } else {
            // Set user role
            $user = new WP_User($user_id);
            $user->set_role('subscriber');
            
            // Create verification token
            $token = wp_generate_password(32, false);
            $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));
            
            update_user_meta($user_id, '_email_verification_token', $token);
            update_user_meta($user_id, '_email_verification_expiry', $expiry);
            update_user_meta($user_id, '_email_verified', false);
            
            // Set trial period
            $trial_started = current_time('mysql');
            $trial_ended = date('Y-m-d H:i:s', strtotime('+30 days', strtotime($trial_started)));
            
            update_user_meta($user_id, '_trial_started_at', $trial_started);
            update_user_meta($user_id, '_trial_ended_at', $trial_ended);
            
            // Send verification email
            $verify_url = home_url('/verify-email/' . $token);
            $subject = __('Verify your email address', 'cvtransformer');
            $message = sprintf(
                __('Hello %s,

Thank you for registering with CV Transformer! Please verify your email address by clicking the link below:

%s

This link will expire in 24 hours.

After verification, you will be directed to choose your subscription plan. CV Transformer offers powerful tools to help you transform your CV and advance your career.

Thank you,
CV Transformer Team', 'cvtransformer'),
                $username,
                $verify_url
            );
            
            $mail_sent = wp_mail($email, $subject, $message);
            
            if ($mail_sent) {
                $reg_success = __('Registration successful! Please check your email to verify your account.', 'cvtransformer');
            } else {
                $reg_error = __('Failed to send verification email. Please try again or contact support.', 'cvtransformer');
            }
        }
    }
}

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="auth-title"><?php _e('Create an Account', 'cvtransformer'); ?></h1>
                
                <?php if ($reg_error): ?>
                <div class="registration-error">
                    <p><?php echo $reg_error; ?></p>
                </div>
                <?php endif; ?>
                
                <?php if ($reg_success): ?>
                <div class="registration-success">
                    <p><?php echo $reg_success; ?></p>
                    <p><?php _e('You can now close this page or proceed to the login page.', 'cvtransformer'); ?></p>
                    <a href="<?php echo esc_url(home_url('/login/')); ?>" class="button button-secondary"><?php _e('Go to Login', 'cvtransformer'); ?></a>
                </div>
                <?php else: ?>
                
                <form method="post" class="registration-form">
                    <div class="form-group">
                        <label for="username"><?php _e('Username', 'cvtransformer'); ?></label>
                        <input type="text" name="username" id="username" value="<?php echo isset($_POST['username']) ? esc_attr($_POST['username']) : ''; ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email"><?php _e('Email Address', 'cvtransformer'); ?></label>
                        <input type="email" name="email" id="email" value="<?php echo isset($_POST['email']) ? esc_attr($_POST['email']) : ''; ?>" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password"><?php _e('Password', 'cvtransformer'); ?></label>
                        <input type="password" name="password" id="password" required>
                        <p class="form-tip"><?php _e('Password must be at least 8 characters long.', 'cvtransformer'); ?></p>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm_password"><?php _e('Confirm Password', 'cvtransformer'); ?></label>
                        <input type="password" name="confirm_password" id="confirm_password" required>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" name="terms" id="terms" required>
                        <label for="terms"><?php _e('I agree to the Terms of Service and Privacy Policy', 'cvtransformer'); ?></label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" name="register_submit" class="button button-primary"><?php _e('Create Account', 'cvtransformer'); ?></button>
                    </div>
                </form>
                
                <div class="auth-links">
                    <p><?php _e('Already have an account?', 'cvtransformer'); ?> <a href="<?php echo esc_url(home_url('/login/')); ?>"><?php _e('Log In', 'cvtransformer'); ?></a></p>
                </div>
                
                <?php endif; ?>
            </div>
        </div>
    </div>
</main>

<style>
.auth-container {
    max-width: 480px;
    margin: 3rem auto;
}

.auth-card {
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
}

.auth-title {
    text-align: center;
    margin-bottom: 1.5rem;
}

.form-group {
    margin-bottom: 1.25rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.form-group input:not([type="checkbox"]) {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
}

.checkbox-group {
    display: flex;
    align-items: flex-start;
}

.checkbox-group input {
    margin-right: 0.5rem;
    margin-top: 0.25rem;
}

.form-tip {
    font-size: 0.85rem;
    margin-top: 0.5rem;
    color: var(--light-text);
}

.form-actions {
    margin-top: 1.5rem;
}

.form-actions .button {
    width: 100%;
    padding: 0.75rem;
}

.auth-links {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
}

.registration-error {
    background-color: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
}

.registration-success {
    background-color: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    text-align: center;
}

.registration-success .button {
    margin-top: 1rem;
}
</style>

<?php
get_footer();
