/**
 * File customizer.js.
 *
 * Theme Customizer enhancements for a better user experience.
 *
 * Contains handlers to make Theme Customizer preview reload changes asynchronously.
 */

( function( $ ) {
    // Site title and description.
    wp.customize( 'blogname', function( value ) {
        value.bind( function( to ) {
            $( '.site-title a' ).text( to );
        } );
    } );
    
    wp.customize( 'blogdescription', function( value ) {
        value.bind( function( to ) {
            $( '.site-description' ).text( to );
        } );
    } );

    // Primary color
    wp.customize( 'primary_color', function( value ) {
        value.bind( function( to ) {
            document.documentElement.style.setProperty('--primary-color', to);
        } );
    } );

    // Secondary color
    wp.customize( 'secondary_color', function( value ) {
        value.bind( function( to ) {
            document.documentElement.style.setProperty('--secondary-color', to);
        } );
    } );

    // Footer text
    wp.customize( 'footer_text', function( value ) {
        value.bind( function( to ) {
            $( '.copyright' ).html( to );
        } );
    } );

    // Homepage Hero Title
    wp.customize( 'hero_title', function( value ) {
        value.bind( function( to ) {
            $( '.hero-title' ).text( to );
        } );
    } );

    // Homepage Hero Subtitle
    wp.customize( 'hero_subtitle', function( value ) {
        value.bind( function( to ) {
            $( '.hero-subtitle' ).text( to );
        } );
    } );

    // CTA Button Text
    wp.customize( 'cta_button_text', function( value ) {
        value.bind( function( to ) {
            $( '.hero-cta .button' ).text( to );
        } );
    } );

    // CTA Button URL
    wp.customize( 'cta_button_url', function( value ) {
        value.bind( function( to ) {
            $( '.hero-cta .button' ).attr( 'href', to );
        } );
    } );

    // Standard Plan Price
    wp.customize( 'standard_plan_price', function( value ) {
        value.bind( function( to ) {
            $( '.standard-plan-price' ).text( '£' + to );
        } );
    } );

    // Pro Plan Price
    wp.customize( 'pro_plan_price', function( value ) {
        value.bind( function( to ) {
            $( '.pro-plan-price' ).text( '£' + to );
        } );
    } );

} )( jQuery );
