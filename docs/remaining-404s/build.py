"""Render bounded public recovery pages; no network, configuration or database access."""
from pathlib import Path
from html import escape as esc
import json

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://www.faraios.com'
INDUSTRIES = {
 'cleaning': ('Cleaning businesses', 'From the first enquiry to a completed clean.',
  'Present your cleaning services and coverage, then keep customer details, quotes, scheduled visits and invoices together.',
  [('Describe the clean', 'Explain the cleaning services you offer, the properties you work in and your service areas. Give customers a clear way to enquire.'),
   ('Agree the requirements', 'Keep the customer’s requirements with their record. Prepare a quote with the agreed work and price before scheduling the visit.'),
   ('Organise the visit', 'Manage the booking and staff assignment, then keep the invoice and manual payment record with the work.')],
  'A customer asks for an end-of-tenancy clean. Clarify the property and scope, prepare a quote, schedule the agreed visit and assign staff. Keep the invoice and payment record organised afterwards.',
  'Check your service catalogue, room and extra options, working hours and booking settings before publishing. Confirm how you will handle repeat visits and changes; do not assume recurring subscriptions or automatic payments are included.'),
 'electrical': ('Electrical services', 'Give every electrical enquiry a clear next step.',
  'Publish your electrical services and coverage, keep site requirements together and organise agreed work with quotes, bookings and invoices.',
  [('Explain your work', 'Describe the installation, repair or maintenance services your business provides. Publish your contact details and service areas.'),
   ('Scope before scheduling', 'Record the customer’s requirements and prepare a quote. Arrange any site assessment needed before agreeing the final scope.'),
   ('Keep the job together', 'Schedule the agreed work, assign staff and keep the invoice and manual payment record together.')],
  'A customer enquires about a lighting installation. Clarify the site requirements, arrange an assessment if needed, prepare a quote and schedule the agreed work.',
  'FaraiOS does not certify electricians, issue compliance certificates or provide electrical safety advice. Manage licences, technical assessments, certificates and safety procedures through your professional processes.'),
 'security': ('Security services', 'Keep installation and service work organised.',
  'Present your security installation and maintenance services, respond to enquiries and manage quoted work in one business workspace.',
  [('Set expectations', 'Explain which installation or maintenance services you provide, where you operate and how customers can contact you.'),
   ('Prepare the scope', 'Keep the customer’s service requirements together and prepare a quote for the work you agree to provide.'),
   ('Plan the visit', 'Schedule the work, assign staff and maintain the invoice and manual payment record.')],
  'A customer requests a camera installation. Discuss the service requirements, arrange an assessment, prepare a quote and schedule the agreed installation.',
  'FaraiOS is not an alarm monitoring, emergency response or surveillance platform. Do not put alarm codes, passwords, footage or security-sensitive site details in public pages or enquiry notes. Confirm licensing and operational requirements separately.'),
 'beauty-spa': ('Beauty & spa businesses', 'A clear introduction to your services.',
  'Show customers what your beauty or spa business offers and organise enquiries, customer records, agreed appointments and invoices.',
  [('Present your services', 'Publish clear service descriptions, images you have permission to use, your location or coverage, and contact information.'),
   ('Discuss the request', 'Keep customer contact details and the requested service together. Confirm the suitability, duration and price directly with the customer.'),
   ('Manage agreed appointments', 'Keep the booking, staff assignment and invoice organised. Record payments received manually.')],
  'A customer asks about a treatment. Discuss the service and availability, agree the appointment details, schedule the booking and keep the invoice with the customer record.',
  'Confirm specialist requirements such as treatment-room allocation, appointment capacity, deposits and packages before choosing the platform. FaraiOS does not provide medical advice or replace treatment consent and professional assessment.'),
 'fitness': ('Fitness businesses', 'Less scattered service administration.',
  'Present your coaching or personal training services and keep customer enquiries, agreed sessions, quotes and invoices organised.',
  [('Explain your offer', 'Describe your training services, where sessions take place and how a prospective customer can contact you.'),
   ('Agree the service', 'Keep contact details and service requirements together. Clarify scope, session arrangements and price before booking.'),
   ('Organise sessions', 'Schedule agreed work, assign the responsible staff member and keep invoices and manual payment records together.')],
  'A prospective client asks about personal training. Discuss their service requirements, agree the session arrangements and price, then schedule the work and keep the invoice organised.',
  'FaraiOS is not a workout tracker or medical system. Class capacity, memberships, recurring billing and exercise programming are not promised by this page. Keep health assessments and sensitive records in an appropriate professional process.'),
 'consulting': ('Consulting businesses', 'Turn an enquiry into clearly agreed work.',
  'Present your consulting services and organise customer details, scoped quotes, scheduled meetings and invoices in one workspace.',
  [('Describe your expertise', 'Explain the consulting services you offer and the types of customers you work with. Publish a clear way to enquire.'),
   ('Agree the engagement', 'Record the service requirements and prepare a quote. Agree deliverables and commercial terms directly with the customer.'),
   ('Keep administration together', 'Schedule agreed work, assign staff and keep the invoice and manual payment record with the customer.')],
  'A prospective customer requests a review of a business process. Clarify the scope, prepare a quote, schedule the agreed work and organise the resulting invoice.',
  'FaraiOS is not a document-signing, time-tracking or project-delivery system. Agree confidentiality, deliverables, milestones and any professional obligations separately. Do not publish confidential client information.'),
}

def link(path, label, prefix):
    return f'<a href="{prefix}{path}">{esc(label)}</a>'

def render(path, label, title, description, body, industry=False, cta=True):
    prefix = '../' if '/' in path else './'
    canonical = BASE + '/' + path
    crumbs=[('Home',BASE+'/')]
    if industry: crumbs.append(('Industries',BASE+'/industries'))
    crumbs.append((label,canonical))
    graph={'@context':'https://schema.org','@graph':[
      {'@type':'WebPage','@id':canonical,'url':canonical,'name':label+' | FaraiOS','description':description,'isPartOf':{'@id':BASE+'/#website'}},
      {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':i,'name':n,'item':u} for i,(n,u) in enumerate(crumbs,1)]}]}
    nav=''.join(link(p,l,prefix) for p,l in [('features','Features'),('industries','Industries'),('pricing','Pricing'),('marketplace','Marketplace')])
    footer=''.join(link(p,l,prefix) for p,l in [('features','Features'),('hosting','Website & hosting'),('industries','Industries'),('pricing','Pricing'),('marketplace','Marketplace'),('about.html','About'),('contact.html','Contact'),('privacy.html','Privacy'),('terms','Terms')])
    breadcrumb=link('', 'Home',prefix)+'<span aria-hidden="true">/</span>'
    if industry: breadcrumb+=link('industries','Industries',prefix)+'<span aria-hidden="true">/</span>'
    breadcrumb+=f'<span aria-current="page">{esc(label)}</span>'
    actions=f'<div class="actions">{link("contact.html","Talk to FaraiOS →",prefix)}{link("features","Explore features →",prefix)}</div>' if cta else ''
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(label)} | FaraiOS</title><meta name="description" content="{esc(description,quote=True)}"><meta name="robots" content="index,follow"><link rel="canonical" href="{canonical}"><link rel="icon" href="{prefix}favicon.svg"><link rel="stylesheet" href="{prefix}marketing.css">
<meta property="og:type" content="website"><meta property="og:site_name" content="FaraiOS"><meta property="og:title" content="{esc(label)} | FaraiOS"><meta property="og:description" content="{esc(description,quote=True)}"><meta property="og:url" content="{canonical}"><meta property="og:image" content="{BASE}/social-preview.png"><meta property="og:image:alt" content="FaraiOS — Build. Grow. Manage."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{esc(label)} | FaraiOS"><meta name="twitter:description" content="{esc(description,quote=True)}"><meta name="twitter:image" content="{BASE}/social-preview.png"><script type="application/ld+json">{json.dumps(graph,ensure_ascii=False)}</script></head>
<body><a class="skip" href="#main">Skip to content</a><header><div class="wrap navigation"><a class="brand" href="{prefix}" aria-label="FaraiOS home"><img src="{prefix}FaraiOS-logo.svg" alt="FaraiOS — Build. Grow. Manage." width="153" height="45"></a><nav aria-label="Main navigation">{nav}</nav>{link('account/index.php?page=signin','Sign in',prefix)}</div></header>
<main id="main"><div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb">{breadcrumb}</nav><section class="hero"><p class="eyebrow">{esc(label)}</p><h1>{esc(title)}</h1><p class="intro">{esc(description)}</p>{actions}</section>{body}</div><section class="closing"><div class="wrap"><p class="eyebrow">Build. Grow. Manage.</p><h2>Your website and daily work. Better together.</h2><p>Explore the current workspace and discuss what fits your business.</p><a class="button" href="{prefix}contact.html">Contact FaraiOS <span aria-hidden="true">↗</span></a></div></section></main>
<footer class="wrap"><div><a class="brand" href="{prefix}"><img src="{prefix}FaraiOS-logo.svg" alt="FaraiOS" width="153" height="45"></a><p>Your website and daily work.<br>Better together.</p></div><nav aria-label="Footer navigation">{footer}</nav><p class="copyright">© 2026 FaraiOS. All rights reserved.</p></footer></body></html>
'''

def build():
    for slug,(label,title,description,cards,example,limits) in INDUSTRIES.items():
        body='<div class="cards">'+''.join(f'<article class="card"><span class="number">{i:02d}</span><h2>{esc(h)}</h2><p>{esc(p)}</p></article>' for i,(h,p) in enumerate(cards,1))+'</div>'
        body+=f'<section class="split"><div><p class="eyebrow">A practical example</p><h2>How the work fits together</h2><p>{esc(example)}</p><a class="text-link" href="../features">Explore current features →</a></div><div class="panel"><h2>Check the fit first</h2><p>{esc(limits)}</p><a class="text-link" href="../contact.html">Discuss your requirements →</a></div></section>'
        body+='<aside class="scope"><h2>Set up for your business</h2><p>This page describes possible uses of the shared workspace. Confirm the features available to your business before relying on a specialist workflow. Publishing a website does not certify a business or its services.</p></aside><section><h2>Explore other industries</h2><div class="industry-grid">'+''.join(f'<a class="industry-link" href="../industries/{s}">{esc(v[0])}<span aria-hidden="true">↗</span></a>' for s,v in INDUSTRIES.items() if s!=slug)+'</div></section>'
        (ROOT/f'industries/{slug}.html').write_text(render('industries/'+slug,label,title,description,body,True))
    body='''<section class="split"><div><h2>Current pricing status</h2><p>FaraiOS is in its prototype stage. Standard subscription prices, hosting packages and custom-domain options have not been confirmed for publication. This page does not offer a paid subscription or take a payment.</p><p>For the current access arrangements, contact <a class="text-link" href="mailto:hello@faraios.com">hello@faraios.com</a>.</p></div><div class="panel"><h2>Discuss what you need</h2><p>Tell us your business type, number of people, website needs and the work you want to manage. We can discuss the current fit and which requirements need further development.</p><a class="text-link" href="./contact.html">Ask about access and pricing →</a></div></section><div class="cards"><article class="card"><h2>Website</h2><p>Review published business pages, branding, service descriptions and coverage. Confirm any domain or hosting requirements.</p></article><article class="card"><h2>Workspace</h2><p>Discuss customer records, quotes, bookings, staff assignments and invoices for your business.</p></article><article class="card"><h2>Before a paid plan</h2><p>Ask for the full price, billing period, included features, limits and cancellation terms in writing before agreeing to any paid service.</p></article></div><aside class="scope"><h2>Business service prices are separate</h2><p>Prices charged by a business using FaraiOS are set by that business. Ask the named business about its service quote, booking, payment or cancellation arrangements.</p></aside>'''
    (ROOT/'pricing.html').write_text(render('pricing','Pricing','Discuss the right setup for your business.','Check the current FaraiOS pricing status and ask about access, business websites and service-management requirements.',body))
    body='''<section class="split"><div><p class="eyebrow">Published business</p><h2>Shalean Cleaning Services</h2><p>Explore Shalean’s published cleaning website for Cape Town homes and businesses. Review its services, coverage and contact details, then enquire directly with Shalean.</p><a class="button" href="./b/shalean-cleaning-services">Visit Shalean’s website <span aria-hidden="true">↗</span></a></div><div class="panel"><h2>Deal with the named business</h2><p>Each business is responsible for its services, availability, quotes, bookings and invoices. Appearing here is not a certification, endorsement or guarantee by FaraiOS.</p><p>Confirm your requirements, service price and arrangements with the business before booking. No payment is collected by this directory page.</p></div></section><aside class="scope"><h2>Build your business presence</h2><p>FaraiOS brings a business website and service administration together. Contact us to discuss publishing your business. Creating an account does not automatically add a listing to this page.</p><a class="text-link" href="./contact.html">Ask about publishing →</a></aside>'''
    (ROOT/'marketplace.html').write_text(render('marketplace','Marketplace','Discover a business on FaraiOS.','Visit a published business website on FaraiOS to explore its services, coverage and contact information.',body))
    body='''<section class="scope"><h2>Website terms — 15 November 2026</h2><p>These terms describe the use of the public FaraiOS website. They do not set a subscription price, replace a separate service agreement or change a contract you already have with a service business.</p></section>
<section class="split"><div><h2>About the website</h2><p>FaraiOS operates under Shalean Technologies in Cape Town, South Africa. For website or platform questions, contact <a class="text-link" href="mailto:hello@faraios.com">hello@faraios.com</a>.</p><h2>Information and availability</h2><p>FaraiOS is being developed. Feature descriptions explain the current offer or clearly identified possible uses. Confirm availability and suitability for your business before relying on a feature. This website does not promise a release date, specialist certification or an outcome for your business.</p><h2>Accounts and content</h2><p>Use accurate details and protect your account credentials. Only publish or upload material you have permission to use. Do not publish another person’s confidential information, unlawful material or misleading service claims.</p><p>Business owners are responsible for reviewing their public pages and keeping their service and contact information accurate.</p></div>
<div><h2>Respectful and secure use</h2><p>Do not attempt to access another business’s private records, bypass access controls, disrupt the service, upload malicious content or use the website to send spam. Report suspected misuse or security issues to FaraiOS privately.</p><h2>Services from listed businesses</h2><p>The named business provides its services and agrees the scope, price, availability, booking and cancellation arrangements with its customer. FaraiOS provides the platform. Contact the business first about its service; contact FaraiOS about a platform problem.</p><h2>Privacy</h2><p>Our <a class="text-link" href="./privacy.html">privacy notice</a> explains platform information handling and how to make a privacy request. Contacting a business or creating an account does not by itself subscribe you to marketing.</p><h2>Pricing and your rights</h2><p>See the <a class="text-link" href="./pricing">pricing page</a> for the current status. Confirm all charges and the applicable terms before agreeing to a paid service. These website terms do not exclude rights or remedies that applicable law gives you.</p><h2>Questions and updates</h2><p>Contact <a class="text-link" href="mailto:hello@faraios.com">hello@faraios.com</a> to raise a website concern. The date above identifies this version. A later website update does not by itself change an existing service agreement.</p></div></section>'''
    (ROOT/'terms.html').write_text(render('terms','Website terms','Using the FaraiOS website.','Read the FaraiOS website terms, responsibilities for published content, service-business arrangements and contact information.',body,cta=False))

if __name__=='__main__': build()
