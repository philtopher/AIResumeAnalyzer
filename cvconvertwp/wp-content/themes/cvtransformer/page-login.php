<?php
/**
 * Template Name: Login Page
 *
 * @package CVTransformer
 */

// Redirect logged-in users to account page
if (is_user_logged_in()) {
    wp_redirect(home_url('/account/'));
    exit;
}

// Process login form
$login_error = '';
if (isset($_POST['login_submit'])) {
    $creds = array(
        'user_login'    => $_POST['username'],
        'user_password' => $_POST['password'],
        'remember'      => isset($_POST['remember'])
    );

    $user = wp_signon($creds, false);

    if (is_wp_error($user)) {
        $login_error = $user->get_error_message();
    } else {
        wp_redirect(home_url('/account/'));
        exit;
    }
}

// Handle "Forgot Password" form
if (isset($_POST['forgot_submit'])) {
    $user_email = $_POST['user_email'];
    $user_data = get_user_by('email', $user_email);

    if (!$user_data) {
        $login_error = __('No user found with that email address.', 'cvtransformer');
    } else {
        // Generate a password reset key
        $key = get_password_reset_key($user_data);
        if (is_wp_error($key)) {
            $login_error = $key->get_error_message();
        } else {
            // Email the reset link
            $reset_url = home_url('/reset-password/?key=' . $key . '&login=' . rawurlencode($user_data->user_login));
            $subject = __('Password Reset Request', 'cvtransformer');
            $message = __('Someone has requested a password reset for the following account:', 'cvtransformer') . "\r\n\r\n";
            $message .= home_url() . "\r\n\r\n";
            $message .= sprintf(__('Username: %s', 'cvtransformer'), $user_data->user_login) . "\r\n\r\n";
            $message .= __('If this was a mistake, just ignore this email and nothing will happen.', 'cvtransformer') . "\r\n\r\n";
            $message .= __('To reset your password, visit the following address:', 'cvtransformer') . "\r\n\r\n";
            $message .= $reset_url . "\r\n";

            wp_mail($user_email, $subject, $message);

            // Show success message
            $login_error = __('Password reset link has been sent to your email address.', 'cvtransformer');
        }
    }
}

// Get any verification messages from URL parameters
$verification_status = isset($_GET['verification']) ? $_GET['verification'] : '';
$verification_message = '';

if ($verification_status === 'needed') {
    $verification_message = __('Please check your email to verify your account before logging in.', 'cvtransformer');
} elseif ($verification_status === 'expired') {
    $verification_message = __('Your verification link has expired. Please request a new one.', 'cvtransformer');
} elseif ($verification_status === 'invalid') {
    $verification_message = __('Invalid verification link. Please request a new one.', 'cvtransformer');
} elseif ($verification_status === 'success') {
    $verification_message = __('Your email has been verified! You can now log in.', 'cvtransformer');
}

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="auth-title"><?php _e('Log In', 'cvtransformer'); ?></h1>
                
                <?php if ($verification_message): ?>
                <div class="verification-message <?php echo $verification_status === 'success' ? 'success' : 'warning'; ?>">
                    <p><?php echo $verification_message; ?></p>
                </div>
                <?php endif; ?>
                
                <?php if ($login_error): ?>
                <div class="login-error">
                    <p><?php echo $login_error; ?></p>
                </div>
                <?php endif; ?>
                
                <form method="post" class="login-form">
                    <div class="form-group">
                        <label for="username"><?php _e('Username or Email', 'cvtransformer'); ?></label>
                        <input type="text" name="username" id="username" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password"><?php _e('Password', 'cvtransformer'); ?></label>
                        <input type="password" name="password" id="password" required>
                    </div>
                    
                    <div class="form-group checkbox-group">
                        <input type="checkbox" name="remember" id="remember">
                        <label for="remember"><?php _e('Remember Me', 'cvtransformer'); ?></label>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" name="login_submit" class="button button-primary"><?php _e('Log In', 'cvtransformer'); ?></button>
                    </div>
                </form>
                
                <div class="auth-links">
                    <a href="#" id="forgot-password-link"><?php _e('Forgot Password?', 'cvtransformer'); ?></a>
                    <a href="<?php echo esc_url(home_url('/register/')); ?>"><?php _e('Create an Account', 'cvtransformer'); ?></a>
                </div>
                
                <div id="forgot-password-form" style="display: none;">
                    <h2><?php _e('Reset Password', 'cvtransformer'); ?></h2>
                    <p><?php _e('Enter your email address and we will send you a link to reset your password.', 'cvtransformer'); ?></p>
                    
                    <form method="post">
                        <div class="form-group">
                            <label for="user_email"><?php _e('Email Address', 'cvtransformer'); ?></label>
                            <input type="email" name="user_email" id="user_email" required>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" name="forgot_submit" class="button button-primary"><?php _e('Send Reset Link', 'cvtransformer'); ?></button>
                            <button type="button" id="cancel-forgot" class="button button-secondary"><?php _e('Cancel', 'cvtransformer'); ?></button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</main>

<script>
jQuery(document).ready(function($) {
    // Toggle forgot password form
    $('#forgot-password-link').on('click', function(e) {
        e.preventDefault();
        $('.login-form, .auth-links').hide();
        $('#forgot-password-form').show();
    });
    
    // Cancel forgot password
    $('#cancel-forgot').on('click', function() {
        $('#forgot-password-form').hide();
        $('.login-form, .auth-links').show();
    });
});
</script>

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
    align-items: center;
}

.checkbox-group input {
    margin-right: 0.5rem;
}

.form-actions {
    margin-top: 1.5rem;
}

.form-actions .button {
    width: 100%;
    padding: 0.75rem;
}

.auth-links {
    display: flex;
    justify-content: space-between;
    margin-top: 1.5rem;
    font-size: 0.9rem;
}

.login-error, .verification-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
}

.verification-message.success {
    background-color: #d4edda;
    color: #155724;
}

.verification-message.warning {
    background-color: #fff3cd;
    color: #856404;
}

#forgot-password-form {
    margin-top: 1.5rem;
}

#forgot-password-form h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
}

#forgot-password-form p {
    margin-bottom: 1.5rem;
}

#forgot-password-form .form-actions {
    display: flex;
    gap: 1rem;
}

#forgot-password-form .button {
    flex: 1;
}
</style>

<?php
get_footer();
