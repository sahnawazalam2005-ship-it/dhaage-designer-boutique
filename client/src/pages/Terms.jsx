import React from 'react';
import { Helmet } from 'react-helmet-async';
import './StaticPages.css';

export default function Terms() {
  return (
    <>
      <Helmet>
        <title>Terms &amp; Conditions | Dhaage Designer</title>
        <meta name="description" content="Terms and conditions for using the Dhaage Designer Mens Boutique website and placing orders." />
      </Helmet>

      <div className="static-hero">
        <div className="container">
          <h1>Terms &amp; Conditions</h1>
          <p>Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="page container static-content">
        <div className="legal-content">
          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using the Dhaage Designer Mens Boutique website, you accept and agree to be bound by these terms and conditions. If you do not agree with any part of these terms, please do not use our website.</p>

          <h2>2. Products & Pricing</h2>
          <p>All product descriptions, images and prices are subject to change without notice. We make every effort to display colours and details accurately, however minor variations may occur due to screen settings. Prices are listed in Indian Rupees (₹) and may include applicable taxes.</p>

          <h2>3. Orders & Payment</h2>
          <p>Orders are accepted via our website. We offer secure online payment via Razorpay (UPI, UPI QR, Credit/Debit Cards, NetBanking, Wallets, and other supported methods). An order is confirmed once payment is verified successfully. We reserve the right to refuse or cancel any order.</p>

          <h2>4. Custom & Bespoke Orders</h2>
          <p>Custom-tailored and bespoke items are crafted specifically for you and may take additional production time. Such orders may not be eligible for returns or exchanges unless there is a manufacturing defect.</p>

          <h2>5. Shipping & Delivery</h2>
          <p>We deliver across India. Delivery timelines are estimates and may vary based on location, tailoring time and courier availability. Once your order is shipped, you will receive tracking information.</p>

          <h2>6. Returns & Exchanges</h2>
          <p>Ready-to-wear items may be returned or exchanged within 7 days of delivery, subject to the item being unused, unwashed and in its original packaging with tags attached. Customised items are non-returnable unless defective.</p>

          <h2>7. Limitation of Liability</h2>
          <p>Dhaage Designer shall not be liable for any indirect, incidental or consequential damages arising from the use of this website or the products purchased through it.</p>

          <h2>8. Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Pune, Maharashtra.</p>

          <h2>9. Contact</h2>
          <p>For questions regarding these terms, please contact us via WhatsApp or our Contact page.</p>
        </div>
      </div>
    </>
  );
}

