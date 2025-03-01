/**
 * Main JavaScript file for the CV Transformer theme
 * 
 * @package CVTransformer
 */

(function($) {
    'use strict';
    
    /**
     * CV Transformation Form Handler
     */
    const CVTransformationForm = {
        init: function() {
            const $form = $('#cv-transformation-form');
            
            if ($form.length) {
                this.bindEvents($form);
                this.initProgressBar();
            }
        },
        
        bindEvents: function($form) {
            $form.on('submit', this.handleSubmit);
            
            // File input styling
            $('#cv_file').on('change', function() {
                const fileName = $(this).val().split('\\').pop();
                if (fileName) {
                    $('.file-name').text(fileName);
                    $('.file-upload-info').show();
                } else {
                    $('.file-upload-info').hide();
                }
            });
            
            // Toggle advanced options
            $('.toggle-advanced-options').on('click', function(e) {
                e.preventDefault();
                $('.advanced-options').toggleClass('open');
                const $icon = $(this).find('i');
                
                if ($('.advanced-options').hasClass('open')) {
                    $(this).find('span').text('Hide Advanced Options');
                    $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                } else {
                    $(this).find('span').text('Show Advanced Options');
                    $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
                }
            });
        },
        
        handleSubmit: function(e) {
            e.preventDefault();
            
            const $form = $(this);
            const $submitBtn = $form.find('button[type="submit"]');
            const $resultContainer = $('#transformation-result');
            const formData = new FormData(this);
            
            // Add nonce to formData
            formData.append('nonce', cvtransformer_params.nonce);
            
            // Show loading state
            $submitBtn.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
            $('#transformation-progress').show();
            
            // Start progress animation
            CVTransformationForm.animateProgress();
            
            // Determine if this is a logged-in user or public request
            const endpoint = $form.hasClass('public-form') 
                ? 'cvtransformer_process_public_cv_transformation' 
                : 'cvtransformer_process_cv_transformation';
            
            $.ajax({
                url: cvtransformer_params.ajax_url,
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                action: endpoint,
                success: function(response) {
                    if (response.success) {
                        // Complete progress bar
                        $('#transformation-progress').find('.progress-bar').css('width', '100%');
                        
                        // Show result
                        $resultContainer.html(`
                            <div class="transformation-header">
                                <h3>CV Transformation Results</h3>
                                <div class="match-score">
                                    <span class="score-label">Match Score</span>
                                    <span class="score-value">${response.data.score}%</span>
                                </div>
                            </div>
                            <div class="transformation-content">
                                <pre>${response.data.transformed_content}</pre>
                            </div>
                            <div class="transformation-feedback">
                                <h4>Feedback</h4>
                                <div class="feedback-section">
                                    <h5><i class="fas fa-star"></i> Strengths</h5>
                                    <ul>
                                        ${response.data.feedback.strengths.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                </div>
                                <div class="feedback-section">
                                    <h5><i class="fas fa-exclamation-circle"></i> Weaknesses</h5>
                                    <ul>
                                        ${response.data.feedback.weaknesses.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                </div>
                                <div class="feedback-section">
                                    <h5><i class="fas fa-lightbulb"></i> Suggestions</h5>
                                    <ul>
                                        ${response.data.feedback.suggestions.map(item => `<li>${item}</li>`).join('')}
                                    </ul>
                                </div>
                            </div>
                            <div class="transformation-actions">
                                <button type="button" class="button button-primary" id="download-transformed-cv">
                                    <i class="fas fa-download"></i> Download Transformed CV
                                </button>
                                <button type="button" class="button" id="reset-transformation">
                                    <i class="fas fa-redo"></i> Start Over
                                </button>
                            </div>
                        `);
                        
                        // Attach event for downloading transformed CV
                        $('#download-transformed-cv').on('click', function() {
                            const blob = new Blob([response.data.transformed_content], {type: 'text/plain'});
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = 'transformed_cv.txt';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                        });
                        
                        // Attach event for resetting
                        $('#reset-transformation').on('click', function() {
                            $form[0].reset();
                            $resultContainer.empty();
                            $submitBtn.prop('disabled', false).html('Transform CV');
                            $('#transformation-progress').hide().find('.progress-bar').css('width', '0%');
                            $('.file-upload-info').hide();
                        });
                        
                        // Scroll to results
                        $('html, body').animate({
                            scrollTop: $resultContainer.offset().top - 50
                        }, 500);
                    } else {
                        alert(response.data || 'An error occurred during processing.');
                    }
                },
                error: function() {
                    alert('A server error occurred. Please try again later.');
                },
                complete: function() {
                    $submitBtn.prop('disabled', false).html('Transform CV');
                }
            });
        },
        
        initProgressBar: function() {
            $('#transformation-progress').html(`
                <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <div class="progress-steps">
                    <div class="step active" data-step="1">Analyzing CV</div>
                    <div class="step" data-step="2">Matching Keywords</div>
                    <div class="step" data-step="3">Generating Content</div>
                    <div class="step" data-step="4">Finalizing</div>
                </div>
            `).hide();
        },
        
        animateProgress: function() {
            const $progressBar = $('#transformation-progress').find('.progress-bar');
            const $steps = $('#transformation-progress').find('.step');
            let currentStep = 1;
            const maxSteps = $steps.length;
            const stepWidth = 100 / maxSteps;
            
            const progressInterval = setInterval(function() {
                if (currentStep <= maxSteps) {
                    $steps.removeClass('active');
                    $steps.filter(`[data-step="${currentStep}"]`).addClass('active');
                    
                    $progressBar.css('width', `${stepWidth * currentStep}%`);
                    currentStep++;
                } else {
                    clearInterval(progressInterval);
                }
            }, 2000);
        }
    };
    
    /**
     * Account Page Handlers
     */
    const AccountPage = {
        init: function() {
            if ($('.account-page').length) {
                this.bindEvents();
            }
        },
        
        bindEvents: function() {
            // Tab navigation
            $('.account-nav-item').on('click', function(e) {
                e.preventDefault();
                
                const target = $(this).attr('href').substring(1);
                
                $('.account-nav-item').removeClass('active');
                $(this).addClass('active');
                
                $('.account-tab-content').removeClass('active');
                $(`#${target}`).addClass('active');
            });
            
            // Subscription management
            $('#upgrade-to-pro').on('click', function(e) {
                e.preventDefault();
                
                const $button = $(this);
                const planId = $button.data('plan-id');
                
                if (!planId) {
                    alert('Invalid plan selection.');
                    return;
                }
                
                $button.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
                
                $.ajax({
                    url: cvtransformer_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_create_payment_link',
                        nonce: cvtransformer_params.nonce,
                        plan_id: planId,
                        action_type: 'upgrade'
                    },
                    success: function(response) {
                        if (response.success && response.data.url) {
                            window.location.href = response.data.url;
                        } else {
                            alert(response.data || 'Failed to create payment link.');
                        }
                    },
                    error: function() {
                        alert('A server error occurred. Please try again later.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).html('Upgrade to Pro');
                    }
                });
            });
            
            $('#downgrade-to-standard').on('click', function(e) {
                e.preventDefault();
                
                if (!confirm('Are you sure you want to downgrade to the Standard plan? You will lose access to Pro features at the end of your current billing period.')) {
                    return;
                }
                
                const $button = $(this);
                
                $button.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
                
                $.ajax({
                    url: cvtransformer_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_downgrade_subscription',
                        nonce: cvtransformer_params.nonce
                    },
                    success: function(response) {
                        if (response.success) {
                            alert('Successfully downgraded to Standard plan. Changes will take effect at the end of your current billing period.');
                            window.location.reload();
                        } else {
                            alert(response.data || 'Failed to downgrade subscription.');
                        }
                    },
                    error: function() {
                        alert('A server error occurred. Please try again later.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).html('Downgrade to Standard');
                    }
                });
            });
        }
    };
    
    /**
     * Pricing Page Handlers
     */
    const PricingPage = {
        init: function() {
            if ($('.pricing-page').length) {
                this.bindEvents();
            }
        },
        
        bindEvents: function() {
            $('.subscribe-button, .upgrade-button').on('click', function(e) {
                e.preventDefault();
                
                const $button = $(this);
                const planId = $button.data('plan-id');
                const actionType = $button.hasClass('upgrade-button') ? 'upgrade' : 'subscribe';
                
                if (!planId) {
                    alert('Invalid plan selection.');
                    return;
                }
                
                $button.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Processing...');
                
                $.ajax({
                    url: cvtransformer_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'cvtransformer_create_payment_link',
                        nonce: cvtransformer_params.nonce,
                        plan_id: planId,
                        action_type: actionType
                    },
                    success: function(response) {
                        if (response.success && response.data.url) {
                            window.location.href = response.data.url;
                        } else {
                            alert(response.data || 'Failed to create payment link.');
                        }
                    },
                    error: function() {
                        alert('A server error occurred. Please try again later.');
                    },
                    complete: function() {
                        $button.prop('disabled', false).html($button.data('original-text') || 'Subscribe');
                    }
                });
            });
        }
    };
    
    /**
     * Pro Features Handlers
     */
    const ProFeatures = {
        init: function() {
            this.initInterviewerAnalysis();
            this.initOrganizationAnalysis();
        },
        
        initInterviewerAnalysis: function() {
            const $form = $('#interviewer-analysis-form');
            
            if ($form.length) {
                $form.on('submit', function(e) {
                    e.preventDefault();
                    
                    const $submitBtn = $form.find('button[type="submit"]');
                    const $resultContainer = $('#interviewer-analysis-result');
                    
                    // Show loading state
                    $submitBtn.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Analyzing...');
                    
                    $.ajax({
                        url: cvtransformer_params.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'cvtransformer_analyze_interviewer',
                            nonce: cvtransformer_params.nonce,
                            interviewer_name: $('#interviewer_name').val(),
                            interviewer_role: $('#interviewer_role').val(),
                            organization_name: $('#organization_name').val()
                        },
                        success: function(response) {
                            if (response.success) {
                                const insights = response.data.insights;
                                
                                $resultContainer.html(`
                                    <div class="analysis-header">
                                        <h3>Interviewer Analysis Results</h3>
                                    </div>
                                    <div class="analysis-sections">
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-user-tie"></i> Background</h4>
                                            <ul>
                                                ${insights.background.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-brain"></i> Expertise</h4>
                                            <ul>
                                                ${insights.expertise.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-history"></i> Recent Activity</h4>
                                            <ul>
                                                ${insights.recentActivity.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-handshake"></i> Common Interests</h4>
                                            <ul>
                                                ${insights.commonInterests.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="analysis-tips">
                                        <h4>Interview Tips</h4>
                                        <ul>
                                            <li>Research ${insights.expertise[0]} and ${insights.expertise[1]} to demonstrate knowledge in their area of expertise.</li>
                                            <li>Prepare to discuss ${insights.commonInterests[0]} and ${insights.commonInterests[1]} as potential connection points.</li>
                                            <li>Review their recent activity on LinkedIn and mention their ${insights.recentActivity[0].toLowerCase()}.</li>
                                        </ul>
                                    </div>
                                `);
                                
                                // Scroll to results
                                $('html, body').animate({
                                    scrollTop: $resultContainer.offset().top - 50
                                }, 500);
                            } else {
                                alert(response.data || 'An error occurred during analysis.');
                            }
                        },
                        error: function() {
                            alert('A server error occurred. Please try again later.');
                        },
                        complete: function() {
                            $submitBtn.prop('disabled', false).html('Analyze Interviewer');
                        }
                    });
                });
            }
        },
        
        initOrganizationAnalysis: function() {
            const $form = $('#organization-analysis-form');
            
            if ($form.length) {
                $form.on('submit', function(e) {
                    e.preventDefault();
                    
                    const $submitBtn = $form.find('button[type="submit"]');
                    const $resultContainer = $('#organization-analysis-result');
                    
                    // Show loading state
                    $submitBtn.prop('disabled', true).html('<i class="fas fa-circle-notch fa-spin"></i> Analyzing...');
                    
                    $.ajax({
                        url: cvtransformer_params.ajax_url,
                        type: 'POST',
                        data: {
                            action: 'cvtransformer_analyze_organization',
                            nonce: cvtransformer_params.nonce,
                            organization_name: $('#organization_name').val(),
                            website: $('#website').val()
                        },
                        success: function(response) {
                            if (response.success) {
                                const analysis = response.data.analysis;
                                
                                $resultContainer.html(`
                                    <div class="analysis-header">
                                        <h3>Organization Analysis Results</h3>
                                    </div>
                                    <div class="analysis-overview">
                                        <h4>Industry Position</h4>
                                        <p>${analysis.industryPosition}</p>
                                    </div>
                                    <div class="analysis-sections">
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-users"></i> Key Competitors</h4>
                                            <ul>
                                                ${analysis.competitors.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-bullhorn"></i> Recent Developments</h4>
                                            <ul>
                                                ${analysis.recentDevelopments.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-building"></i> Company Culture</h4>
                                            <ul>
                                                ${analysis.culture.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                        <div class="analysis-section">
                                            <h4><i class="fas fa-laptop-code"></i> Tech Stack</h4>
                                            <ul>
                                                ${analysis.techStack.map(item => `<li>${item}</li>`).join('')}
                                            </ul>
                                        </div>
                                    </div>
                                    <div class="analysis-tips">
                                        <h4>Application Tips</h4>
                                        <ul>
                                            <li>Highlight your experience with ${analysis.techStack[0]} and ${analysis.techStack[1]} in your CV.</li>
                                            <li>Emphasize your alignment with their cultural values like ${analysis.culture[0].toLowerCase()} and ${analysis.culture[1].toLowerCase()}.</li>
                                            <li>Research their recent ${analysis.recentDevelopments[0].toLowerCase()} and be prepared to discuss it.</li>
                                        </ul>
                                    </div>
                                `);
                                
                                // Scroll to results
                                $('html, body').animate({
                                    scrollTop: $resultContainer.offset().top - 50
                                }, 500);
                            } else {
                                alert(response.data || 'An error occurred during analysis.');
                            }
                        },
                        error: function() {
                            alert('A server error occurred. Please try again later.');
                        },
                        complete: function() {
                            $submitBtn.prop('disabled', false).html('Analyze Organization');
                        }
                    });
                });
            }
        }
    };
    
    /**
     * Initialize on document ready
     */
    $(document).ready(function() {
        CVTransformationForm.init();
        AccountPage.init();
        PricingPage.init();
        ProFeatures.init();
        
        // Save original button text for restoration after loading
        $('.subscribe-button, .upgrade-button').each(function() {
            $(this).data('original-text', $(this).text());
        });
    });
    
})(jQuery);
