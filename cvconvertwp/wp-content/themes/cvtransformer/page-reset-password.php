<?php
/**
 * Template Name: Reset Password Page
 *
 * @package CVTransformer
 */

// Get key and login from URL
$key = isset($_GET['key']) ? sanitize_text_field($_GET['key']) : '';
$login = isset($_GET['login']) ? sanitize_text_field($_GET['login']) : '';

$reset_error = '';
$reset_success = '';
$is_valid_key = false;

// Verify key and login
if (!empty($key) && !empty($login)) {
    $user = check_password_reset_key($key, $login);
    
    if (is_wp_error($user)) {
        $reset_error = $user->get_error_message();
    } else {
        $is_valid_key = true;
    }
}

// Process reset form
if (isset($_POST['reset_submit']) && $is_valid_key) {
    $password = $_POST['password'];
    $confirm_password = $_POST['confirm_password'];
    
    // Validate passwords
    if (empty($password) || empty($confirm_password)) {
        $reset_error = __('Please enter a new password.', 'cvtransformer');
    } elseif ($password !== $confirm_password) {
        $reset_error = __('Passwords do not match.', 'cvtransformer');
    } elseif (strlen($password) < 8) {
        $reset_error = __('Password must be at least 8 characters long.', 'cvtransformer');
    } else {
        // Reset the password
        reset_password($user, $password);
        
        // Set success message
        $reset_success = __('Your password has been reset successfully. You can now log in with your new password.', 'cvtransformer');
    }
}

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="auth-title"><?php _e('Reset Password', 'cvtransformer'); ?></h1>
                
                <?php if ($reset_error): ?>
                <div class="reset-error">
                    <p><?php echo $reset_error; ?></p>
                </div>
                <?php endif; ?>
                
                <?php if ($reset_success): ?>
                <div class="reset-success">
                    <p><?php echo $reset_success; ?></p>
                    <a href="<?php echo esc_url(home_url('/login/')); ?>" class="button button-primary"><?php _e('Go to Login', 'cvtransformer'); ?></a>
                </div>
                <?php else: ?>
                
                <?php if ($is_valid_key): ?>
                <form method="post" class="reset-form">
                    <div class="form-group">
                        <label for="password"><?php _e('New Password', 'cvtransformer'); ?></label>
                        <input type="password" name="password" id="password" required>
                        <p class="form-tip"><?php _e('Password must be at least 8 characters long.', 'cvtransformer'); ?></p>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirm_password"><?php _e('Confirm New Password', 'cvtransformer'); ?></label>
                        <input type="password" name="confirm_password" id="confirm_password" required>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" name="reset_submit" class="button button-primary"><?php _e('Reset Password', 'cvtransformer'); ?></button>
                    </div>
                </form>
                <?php else: ?>
                <div class="reset-info">
                    <p><?php _e('Invalid or expired password reset link. Please request a new password reset link.', 'cvtransformer'); ?></p>
                    <a href="<?php echo esc_url(home_url('/login/')); ?>" class="button button-primary"><?php _e('Back to Login', 'cvtransformer'); ?></a>
                </div>
                <?php endif; ?>
                
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

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: 4px;
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

.reset-error {
    background-color: #f8d7da;
    color: #721c24;
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
}

.reset-success, .reset-info {
    background-color: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1.5rem;
    text-align: center;
}

.reset-info {
    background-color: #cce5ff;
    color: #004085;
}

.reset-success .button, .reset-info .button {
    margin-top: 1rem;
}
</style>

<?php
get_footer();
