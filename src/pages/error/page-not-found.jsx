import React from 'react';

function PageNotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
      color: '#1e293b',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '5%',
        width: '350px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(124, 88, 237, 0.08) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 8s ease-in-out infinite'
      }}></div>
      
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: '280px',
        height: '280px',
        background: 'radial-gradient(circle, rgba(52, 211, 153, 0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(50px)',
        animation: 'float 6s ease-in-out infinite reverse'
      }}></div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-30px) scale(1.1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .btn-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .btn-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(124, 88, 237, 0.25);
        }
        
        .btn-outline-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .btn-outline-hover:hover {
          background: rgba(124, 88, 237, 0.05);
          transform: translateY(-2px);
        }
        
        .link-hover:hover {
          transform: translateX(3px);
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        maxWidth: '700px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Illustration Container */}
        <div style={{
          position: 'relative',
          width: '280px',
          height: '280px',
          margin: '0 auto 2.5rem',
          opacity: 0,
          animationDelay: '0s'
        }} className="fade-in-up">
          {/* Main Circle */}
          <div style={{
            width: '280px',
            height: '280px',
            background: 'linear-gradient(135deg, #7c58ed 0%, #9b7bf7 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 30px 80px rgba(124, 88, 237, 0.35)',
            position: 'relative',
            animation: 'pulse 3s ease-in-out infinite'
          }}>
            {/* Inner decorative circle */}
            <div style={{
              width: '220px',
              height: '220px',
              border: '3px dashed rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {/* Road/Path Icon */}
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.7 3.3L6.3 5.7C5.2 6.8 4.5 8.2 4.3 9.7L3.1 18.1C2.9 19.7 4.2 21 5.8 21H18.2C19.8 21 21.1 19.7 20.9 18.1L19.7 9.7C19.5 8.2 18.8 6.8 17.7 5.7L15.3 3.3C13.8 1.9 11.6 1.9 10.1 3.3L8.7 3.3Z" 
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V10M12 13V15" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="12" cy="18" r="1.5" fill="white"/>
              </svg>
              <div style={{
                fontSize: '3rem',
                fontWeight: '700',
                color: 'white',
                letterSpacing: '0.5rem',
                marginLeft: '0.5rem'
              }}>404</div>
            </div>
          </div>
          
          {/* Decorative elements around circle */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '-15%',
            width: '60px',
            height: '60px',
            background: '#34d399',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(52, 211, 153, 0.3)',
            animation: 'float 4s ease-in-out infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '-10%',
            width: '50px',
            height: '50px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: '12px',
            boxShadow: '0 10px 30px rgba(245, 158, 11, 0.3)',
            animation: 'float 5s ease-in-out infinite reverse',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill="white"/>
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          fontWeight: '700',
          marginBottom: '1rem',
          color: '#1e293b',
          letterSpacing: '-0.02em',
          opacity: 0,
          animationDelay: '0.2s'
        }} className="fade-in-up">
          Oops! Wrong Turn
        </h1>

        {/* Subheading */}
        <div style={{
          fontSize: 'clamp(1.125rem, 2.5vw, 1.375rem)',
          fontWeight: '600',
          color: '#7c58ed',
          marginBottom: '1rem',
          opacity: 0,
          animationDelay: '0.3s'
        }} className="fade-in-up">
          Looks like you've taken a detour!
        </div>

        {/* Description */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.125rem)',
          lineHeight: '1.7',
          color: '#64748b',
          marginBottom: '3rem',
          fontWeight: '400',
          maxWidth: '540px',
          margin: '0 auto 3rem',
          opacity: 0,
          animationDelay: '0.4s'
        }} className="fade-in-up">
          The page you're searching for doesn't exist or has been moved. Don't worry though, we'll help you find your way back.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
          opacity: 0,
          animationDelay: '0.5s',
          marginBottom: '3rem'
        }} className="fade-in-up">
          <button 
            onClick={() => window.location.href = '/'}
            className="btn-hover"
            style={{
              padding: '1.125rem 2.75rem',
              fontSize: '1.0625rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #7c58ed 0%, #9b7bf7 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Home
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="btn-outline-hover"
            style={{
              padding: '1.125rem 2.75rem',
              fontSize: '1.0625rem',
              fontWeight: '600',
              background: 'white',
              color: '#7c58ed',
              border: '2px solid #7c58ed',
              borderRadius: '12px',
              cursor: 'pointer',
              letterSpacing: '0.3px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Go Back
          </button>
        </div>

        {/* Help Section */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          maxWidth: '600px',
          margin: '0 auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          opacity: 0,
          animationDelay: '0.6s'
        }} className="fade-in-up">
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '1rem'
          }}>
            Need Help?
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            fontSize: '0.9375rem'
          }}>
            <a href="/" style={{
              color: '#7c58ed',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'transform 0.2s'
            }} className="link-hover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Help Center
            </a>
            <a href="/contact" style={{
              color: '#7c58ed',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'transform 0.2s'
            }} className="link-hover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Contact Us
            </a>
            <a href="/sitemap" style={{
              color: '#7c58ed',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'transform 0.2s'
            }} className="link-hover">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 3H10V10H3V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 3H21V10H14V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14H21V21H14V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 14H10V21H3V14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Site Map
            </a>
          </div>
        </div>

        {/* Footer hint */}
        <p style={{
          marginTop: '2rem',
          fontSize: '0.875rem',
          color: '#94a3b8',
          fontWeight: '400',
          opacity: 0,
          animationDelay: '0.7s'
        }} className="fade-in-up">
          Error Code: 404 • Page Not Found
        </p>
      </div>
    </div>
  );
}

export default PageNotFound;