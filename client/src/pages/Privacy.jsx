import React from 'react';
import { Helmet } from 'react-helmet-async';
import './StaticPages.css';

export default function Privacy() {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | Dhaage Designer</title>
        <meta name="description" content="Privacy policy for Dhaage Designer Mens Boutique. Learn how we collect, use and protect your information." />
      </Helmet>

      <div className="static-hero">
        <div className="container">
          <h1>Privacy Policy</h1>
          <p>Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="page container static-content">
        <div className="legal-content">
          <h2>1. Information We Collect</h2>
          <p>When you use Dhaage Designer Mens Boutique, we collect information you provide directly, including your name, email address, phone number, delivery address and order details. We also collect limited technical information such as browser type and device information to improve our services.</p>

          <h2>2. How We Use Your Information</h2>
          <p>Your information is used to process and deliver your orders, provide customer support, send order updates and tracking information, improve our website and services, and — with your consent — send promotional offers about our collections.</p>

          <h2>3. Payments</h2>
          <p>We do not store your card or UPI details. Payments are processed securely through Razorpay, our payment gateway provider. When you place an order, your order details (including name, address and items) are shared with Razorpay solely to process your payment and fulfill your order.</p>

          <h2>4. Data Security</h2>
          <p>We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure or destruction. However, no method of transmission over the internet is 100% secure.</p>

          <h2>5. Cookies</h2>
          <p>Our website uses local storage to remember your shopping cart and login session. You can clear this data at any time through your browser settings.</p>

          <h2>6. Third-Party Services</h2>
          <p>We use trusted third-party services such as WhatsApp (for order communication), Google Maps (for location) and Instagram (for social media). These services have their own privacy policies.</p>

          <h2>7. Your Rights</h2>
          <p>You may request access to, correction of, or deletion of your personal information at any time by contacting us. You may also choose not to receive promotional communications.</p>

          <h2>8. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us via WhatsApp or visit our Contact page.</p>
        </div>
      </div>
    </>
  );
}

