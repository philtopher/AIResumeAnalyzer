<?php
/**
 * Template Name: CV Transformation Page
 *
 * @package CVTransformer
 */

// Redirect non-subscribers to pricing page
if (is_user_logged_in()) {
    $user_id = get_current_user_id();
    $subscription_status = get_user_meta($user_id, '_subscription_status', true);
    
    if ($subscription_status !== 'active') {
        wp_redirect(home_url('/pricing/'));
        exit;
    }
} else {
    wp_redirect(home_url('/login/'));
    exit;
}

get_header();
?>

<main id="primary" class="site-main">
    <div class="container">
        <div class="page-header">
            <h1 class="page-title"><?php _e('Transform Your CV', 'cvtransformer'); ?></h1>
            <p class="page-description"><?php _e('Upload your CV and target job description to get an optimized CV tailored for your desired role.', 'cvtransformer'); ?></p>
        </div>
        
        <div class="transform-container">
            <div class="transform-form-section">
                <div class="card">
                    <div class="card-content">
                        <form id="cv-transform-form" class="cv-transform-form" enctype="multipart/form-data">
                            <div class="form-group">
                                <label for="cv-file" class="form-label"><?php _e('Upload CV (PDF or DOCX)', 'cvtransformer'); ?></label>
                                <div class="file-upload-area" id="file-upload-area">
                                    <input type="file" id="cv-file" name="cv_file" accept=".pdf,.docx" class="hidden-file-input">
                                    <div class="upload-icon">
                                        <i class="fas fa-upload"></i>
                                    </div>
                                    <p class="file-name-display" id="file-name-display"><?php _e('Click or drag file to upload', 'cvtransformer'); ?></p>
                                </div>
                                <p class="form-text text-muted">
                                    <span class="text-warning"><?php _e('Note:', 'cvtransformer'); ?></span>
                                    <?php _e('Your CV will be processed securely and automatically deleted after transformation.', 'cvtransformer'); ?>
                                </p>
                            </div>
                            
                            <div class="form-group">
                                <label for="target-role" class="form-label"><?php _e('Target Role', 'cvtransformer'); ?></label>
                                <input type="text" id="target-role" name="target_role" class="form-control" required>
                            </div>
                            
                            <div class="form-group">
                                <label for="job-description" class="form-label"><?php _e('Job Description', 'cvtransformer'); ?></label>
                                <textarea id="job-description" name="job_description" class="form-control" rows="5" required></textarea>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="button button-primary transform-button" id="transform-button">
                                    <span class="button-text"><?php _e('Transform CV', 'cvtransformer'); ?></span>
                                    <span class="button-loading" style="display: none;">
                                        <i class="fas fa-spinner fa-spin"></i> <?php _e('Processing...', 'cvtransformer'); ?>
                                    </span>
                                </button>
                            </div>
                            
                            <?php wp_nonce_field('cvtransformer_nonce', 'nonce'); ?>
                        </form>
                    </div>
                </div>
            </div>
            
            <div class="transform-result-section">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title"><?php _e('Transformation Result', 'cvtransformer'); ?></h3>
                    </div>
                    <div class="card-content">
                        <div id="transform-result" class="transform-result">
                            <div class="no-result-message">
                                <i class="fas fa-file-alt"></i>
                                <p><?php _e('Your transformed CV will appear here after processing.', 'cvtransformer'); ?></p>
                            </div>
                            
                            <div class="result-content" style="display: none;">
                                <div class="result-score">
                                    <h4><?php _e('Match Score:', 'cvtransformer'); ?></h4>
                                    <div class="score-display">
                                        <span id="score-value">0</span><span>%</span>
                                    </div>
                                </div>
                                
                                <div class="result-actions">
                                    <button id="view-cv-button" class="button button-secondary">
                                        <i class="fas fa-eye"></i> <?php _e('View', 'cvtransformer'); ?>
                                    </button>
                                    <button id="download-cv-button" class="button button-secondary">
                                        <i class="fas fa-download"></i> <?php _e('Download', 'cvtransformer'); ?>
                                    </button>
                                </div>
                                
                                <div class="cv-preview" id="cv-preview"></div>
                                
                                <div class="feedback-section">
                                    <h4><?php _e('Feedback & Analysis', 'cvtransformer'); ?></h4>
                                    
                                    <div class="feedback-category">
                                        <div class="category-header">
                                            <i class="fas fa-check-circle text-success"></i>
                                            <h5><?php _e('Strengths', 'cvtransformer'); ?></h5>
                                        </div>
                                        <ul id="strengths-list" class="feedback-list"></ul>
                                    </div>
                                    
                                    <div class="feedback-category">
                                        <div class="category-header">
                                            <i class="fas fa-times-circle text-danger"></i>
                                            <h5><?php _e('Areas for Improvement', 'cvtransformer'); ?></h5>
                                        </div>
                                        <ul id="weaknesses-list" class="feedback-list"></ul>
                                    </div>
                                    
                                    <div class="feedback-category">
                                        <div class="category-header">
                                            <i class="fas fa-lightbulb text-warning"></i>
                                            <h5><?php _e('Suggestions', 'cvtransformer'); ?></h5>
                                        </div>
                                        <ul id="suggestions-list" class="feedback-list"></ul>
                                    </div>
                                    
                                    <?php
                                    // Check if user has Pro subscription
                                    $is_pro = get_user_meta(get_current_user_id(), '_subscription_is_pro', true) === '1';
                                    if ($is_pro) :
                                    ?>
                                    <div class="pro-insights-section">
                                        <h4><?php _e('Pro Insights', 'cvtransformer'); ?></h4>
                                        
                                        <div class="insights-category">
                                            <div class="category-header">
                                                <i class="fas fa-building text-info"></i>
                                                <h5><?php _e('Organization Insights', 'cvtransformer'); ?></h5>
                                            </div>
                                            <p><?php _e('Enter organization details to analyze:', 'cvtransformer'); ?></p>
                                            <div class="pro-form">
                                                <input type="text" id="organization-name" class="form-control" placeholder="<?php _e('Organization Name', 'cvtransformer'); ?>">
                                                <input type="text" id="organization-website" class="form-control" placeholder="<?php _e('Website (optional)', 'cvtransformer'); ?>">
                                                <button id="analyze-organization-button" class="button button-secondary">
                                                    <?php _e('Analyze', 'cvtransformer'); ?>
                                                </button>
                                            </div>
                                            <div id="organization-insights-results" class="insights-results" style="display: none;"></div>
                                        </div>
                                        
                                        <div class="insights-category">
                                            <div class="category-header">
                                                <i class="fas fa-user-tie text-primary"></i>
                                                <h5><?php _e('Interviewer Insights', 'cvtransformer'); ?></h5>
                                            </div>
                                            <p><?php _e('Enter interviewer details to analyze:', 'cvtransformer'); ?></p>
                                            <div class="pro-form">
                                                <input type="text" id="interviewer-name" class="form-control" placeholder="<?php _e('Interviewer Name', 'cvtransformer'); ?>">
                                                <input type="text" id="interviewer-role" class="form-control" placeholder="<?php _e('Interviewer Role', 'cvtransformer'); ?>">
                                                <input type="text" id="interviewer-company" class="form-control" placeholder="<?php _e('Company', 'cvtransformer'); ?>">
                                                <button id="analyze-interviewer-button" class="button button-secondary">
                                                    <?php _e('Analyze', 'cvtransformer'); ?>
                                                </button>
                                            </div>
                                            <div id="interviewer-insights-results" class="insights-results" style="display: none;"></div>
                                        </div>
                                    </div>
                                    <?php else : ?>
                                    <div class="pro-upgrade-section">
                                        <h4><?php _e('Unlock Pro Insights', 'cvtransformer'); ?></h4>
                                        <p><?php _e('Upgrade to the Pro plan to access organization and interviewer insights.', 'cvtransformer'); ?></p>
                                        <a href="<?php echo esc_url(home_url('/pricing/')); ?>" class="button button-primary">
                                            <?php _e('Upgrade to Pro', 'cvtransformer'); ?>
                                        </a>
                                    </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>

<script>
jQuery(document).ready(function($) {
    // File upload handling
    $('#file-upload-area').on('click', function() {
        $('#cv-file').trigger('click');
    });
    
    $('#cv-file').on('change', function() {
        var fileName = $(this).val().split('\\').pop();
        if (fileName) {
            $('#file-name-display').text(fileName);
            $('#file-upload-area').addClass('has-file');
        } else {
            $('#file-name-display').text('<?php _e('Click or drag file to upload', 'cvtransformer'); ?>');
            $('#file-upload-area').removeClass('has-file');
        }
    });
    
    // CV Transformation form submission
    $('#cv-transform-form').on('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        var cvFile = $('#cv-file')[0].files[0];
        var targetRole = $('#target-role').val();
        var jobDescription = $('#job-description').val();
        
        if (!cvFile || !targetRole || !jobDescription) {
            alert('<?php _e('Please fill in all required fields.', 'cvtransformer'); ?>');
            return;
        }
        
        // Prepare form data
        var formData = new FormData();
        formData.append('action', 'cvtransformer_process_cv_transformation');
        formData.append('nonce', $('#nonce').val());
        formData.append('cv_file', cvFile);
        formData.append('target_role', targetRole);
        formData.append('job_description', jobDescription);
        
        // Update UI to show loading state
        $('#transform-button .button-text').hide();
        $('#transform-button .button-loading').show();
        $('#transform-button').attr('disabled', true);
        
        // Submit AJAX request
        $.ajax({
            url: cvtransformer_params.ajax_url,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                // Reset loading state
                $('#transform-button .button-text').show();
                $('#transform-button .button-loading').hide();
                $('#transform-button').attr('disabled', false);
                
                if (response.success) {
                    // Store transformation data
                    window.transformationData = response.data;
                    
                    // Update result UI
                    $('.no-result-message').hide();
                    $('.result-content').show();
                    
                    // Update score
                    $('#score-value').text(response.data.score);
                    
                    // Update CV preview
                    $('#cv-preview').html(response.data.transformed_content.replace(/\n/g, '<br>'));
                    
                    // Update feedback lists
                    $('#strengths-list').empty();
                    $.each(response.data.feedback.strengths, function(i, strength) {
                        $('#strengths-list').append('<li>' + strength + '</li>');
                    });
                    
                    $('#weaknesses-list').empty();
                    $.each(response.data.feedback.weaknesses, function(i, weakness) {
                        $('#weaknesses-list').append('<li>' + weakness + '</li>');
                    });
                    
                    $('#suggestions-list').empty();
                    $.each(response.data.feedback.suggestions, function(i, suggestion) {
                        $('#suggestions-list').append('<li>' + suggestion + '</li>');
                    });
                    
                    // Scroll to result
                    $('html, body').animate({
                        scrollTop: $('.transform-result-section').offset().top - 100
                    }, 500);
                } else {
                    alert(response.data || '<?php _e('An error occurred while processing your CV.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                // Reset loading state
                $('#transform-button .button-text').show();
                $('#transform-button .button-loading').hide();
                $('#transform-button').attr('disabled', false);
                
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });
    
    // View CV button
    $('#view-cv-button').on('click', function() {
        $('#cv-preview').slideToggle();
    });
    
    // Download CV button
    $('#download-cv-button').on('click', function() {
        if (!window.transformationData) return;
        
        var content = window.transformationData.transformed_content;
        var filename = 'transformed_cv_' + new Date().getTime() + '.txt';
        
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    });
    
    <?php if ($is_pro) : ?>
    // Organization analysis
    $('#analyze-organization-button').on('click', function() {
        var organizationName = $('#organization-name').val();
        var website = $('#organization-website').val();
        
        if (!organizationName) {
            alert('<?php _e('Please enter the organization name.', 'cvtransformer'); ?>');
            return;
        }
        
        $(this).attr('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> <?php _e('Analyzing...', 'cvtransformer'); ?>');
        
        $.ajax({
            url: cvtransformer_params.ajax_url,
            type: 'POST',
            data: {
                action: 'cvtransformer_analyze_organization',
                nonce: $('#nonce').val(),
                organization_name: organizationName,
                website: website
            },
            success: function(response) {
                $('#analyze-organization-button').attr('disabled', false).text('<?php _e('Analyze', 'cvtransformer'); ?>');
                
                if (response.success) {
                    var analysisHtml = '<div class="insights-result-content">';
                    analysisHtml += '<h5><?php _e('Industry Position', 'cvtransformer'); ?></h5>';
                    analysisHtml += '<p>' + response.data.analysis.industryPosition + '</p>';
                    
                    analysisHtml += '<h5><?php _e('Competitors', 'cvtransformer'); ?></h5>';
                    analysisHtml += '<ul>';
                    $.each(response.data.analysis.competitors, function(i, competitor) {
                        analysisHtml += '<li>' + competitor + '</li>';
                    });
                    analysisHtml += '</ul>';
                    
                    analysisHtml += '<h5><?php _e('Recent Developments', 'cvtransformer'); ?></h5>';
                    analysisHtml += '<ul>';
                    $.each(response.data.analysis.recentDevelopments, function(i, development) {
                        analysisHtml += '<li>' + development + '</li>';
                    });
                    analysisHtml += '</ul>';
                    
                    analysisHtml += '<h5><?php _e('Company Culture', 'cvtransformer'); ?></h5>';
                    analysisHtml += '<ul>';
                    $.each(response.data.analysis.culture, function(i, item) {
                        analysisHtml += '<li>' + item + '</li>';
                    });
                    analysisHtml += '</ul>';
                    
                    analysisHtml += '<h5><?php _e('Tech Stack', 'cvtransformer'); ?></h5>';
                    analysisHtml += '<ul>';
                    $.each(response.data.analysis.techStack, function(i, tech) {
                        analysisHtml += '<li>' + tech + '</li>';
                    });
                    analysisHtml += '</ul>';
                    
                    analysisHtml += '</div>';
                    
                    $('#organization-insights-results').html(analysisHtml).slideDown();
                } else {
                    alert(response.data || '<?php _e('An error occurred during analysis.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                $('#analyze-organization-button').attr('disabled', false).text('<?php _e('Analyze', 'cvtransformer'); ?>');
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });
    
    // Interviewer analysis
    $('#analyze-interviewer-button').on('click', function() {
        var interviewerName = $('#interviewer-name').val();
        var interviewerRole = $('#interviewer-role').val();
        var interviewerCompany = $('#interviewer-company').val();
        
        if (!interviewerName || !interviewerCompany) {
            alert('<?php _e('Please enter the interviewer name and company.', 'cvtransformer'); ?>');
            return;
        }
        
        $(this).attr('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> <?php _e('Analyzing...', 'cvtransformer'); ?>');
        
        $.ajax({
            url: cvtransformer_params.ajax_url,
            type: 'POST',
            data: {
                action: 'cvtransformer_analyze_interviewer',
                nonce: $('#nonce').val(),
                interviewer_name: interviewerName,
                interviewer_role: interviewerRole,
                organization_name: interviewerCompany
            },
            success: function(response) {
                $('#analyze-interviewer-button').attr('disabled', false).text('<?php _e('Analyze', 'cvtransformer'); ?>');
                
                if (response.success) {
                    var insightsHtml = '<div class="insights-result-content">';
                    
                    insightsHtml += '<h5><?php _e('Background', 'cvtransformer'); ?></h5>';
                    insightsHtml += '<ul>';
                    $.each(response.data.insights.background, function(i, item) {
                        insightsHtml += '<li>' + item + '</li>';
                    });
                    insightsHtml += '</ul>';
                    
                    insightsHtml += '<h5><?php _e('Expertise Areas', 'cvtransformer'); ?></h5>';
                    insightsHtml += '<ul>';
                    $.each(response.data.insights.expertise, function(i, item) {
                        insightsHtml += '<li>' + item + '</li>';
                    });
                    insightsHtml += '</ul>';
                    
                    insightsHtml += '<h5><?php _e('Recent Activity', 'cvtransformer'); ?></h5>';
                    insightsHtml += '<ul>';
                    $.each(response.data.insights.recentActivity, function(i, item) {
                        insightsHtml += '<li>' + item + '</li>';
                    });
                    insightsHtml += '</ul>';
                    
                    insightsHtml += '<h5><?php _e('Common Interests', 'cvtransformer'); ?></h5>';
                    insightsHtml += '<ul>';
                    $.each(response.data.insights.commonInterests, function(i, item) {
                        insightsHtml += '<li>' + item + '</li>';
                    });
                    insightsHtml += '</ul>';
                    
                    insightsHtml += '</div>';
                    
                    $('#interviewer-insights-results').html(insightsHtml).slideDown();
                } else {
                    alert(response.data || '<?php _e('An error occurred during analysis.', 'cvtransformer'); ?>');
                }
            },
            error: function() {
                $('#analyze-interviewer-button').attr('disabled', false).text('<?php _e('Analyze', 'cvtransformer'); ?>');
                alert('<?php _e('An error occurred while communicating with the server.', 'cvtransformer'); ?>');
            }
        });
    });
    <?php endif; ?>
});
</script>

<style>
/* CV Transform page specific styles */
.transform-container {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2rem;
    margin-bottom: 3rem;
}

@media (min-width: 768px) {
    .transform-container {
        grid-template-columns: 1fr 1fr;
    }
}

.hidden-file-input {
    display: none;
}

.file-upload-area {
    border: 2px dashed var(--border-color);
    border-radius: 0.5rem;
    padding: 2rem;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.2s ease;
}

.file-upload-area:hover {
    border-color: var(--primary-color);
}

.file-upload-area.has-file {
    border-color: var(--success);
    background-color: rgba(16, 185, 129, 0.05);
}

.upload-icon {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--light-text);
}

.cv-preview {
    background-color: var(--light-background);
    padding: 1.5rem;
    border-radius: 0.5rem;
    font-family: monospace;
    white-space: pre-wrap;
    height: 400px;
    overflow-y: auto;
    margin-top: 1rem;
}

.no-result-message {
    text-align: center;
    padding: 2rem;
    color: var(--light-text);
}

.no-result-message i {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
}

.result-score {
    display: flex;
    align-items: center;
    margin-bottom: 1.5rem;
}

.result-score h4 {
    margin: 0;
    margin-right: 1rem;
}

.score-display {
    font-size: 2rem;
    font-weight: 700;
    color: var(--primary-color);
}

.result-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.feedback-category {
    margin-bottom: 1.5rem;
}

.category-header {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
}

.category-header i {
    margin-right: 0.5rem;
}

.category-header h5 {
    margin: 0;
}

.feedback-list {
    margin: 0;
    padding-left: 1.5rem;
}

.feedback-list li {
    margin-bottom: 0.5rem;
}

.text-success {
    color: var(--success);
}

.text-danger {
    color: var(--error);
}

.text-warning {
    color: var(--warning);
}

.text-info {
    color: #3b82f6;
}

.text-primary {
    color: var(--primary-color);
}

.pro-insights-section {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-color);
}

.insights-category {
    margin-bottom: 2rem;
}

.pro-form {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin: 1rem 0;
}

.insights-results {
    background-color: var(--light-background);
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-top: 1rem;
}

.pro-upgrade-section {
    margin-top: 2rem;
    padding: 1.5rem;
    text-align: center;
    background-color: rgba(79, 70, 229, 0.05);
    border-radius: 0.5rem;
    border: 1px solid var(--border-color);
}

.pro-upgrade-section h4 {
    margin-top: 0;
}
</style>

<?php
get_footer();
