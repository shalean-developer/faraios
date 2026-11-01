// Explicit TEST-only launcher. Existing _standard_accounting.cjs unchanged.
const runtime=require('./src/hosted-runtime.cjs').detectHostedRuntime();
if(runtime==='passenger')PhusionPassenger.configure({autoInstall:false});
Promise.all([import('./src/t19-standard-runtime.js'),import('./src/t20-payment-runtime.js'),import('./hosted-staging.mjs'),import('./src/t20-payment-setup.js')]).then(async([standard,payments,host,setup])=>{
 const accounting=await standard.createStandardHttpsRuntime(await standard.loadStandardHttpsConfiguration());
 const payment=await payments.loadPaymentRuntime();
 try{await host.startHostedStaging({accountingProxy:accounting,accountingConnectionOnly:true,paymentProxy:payment.handler,paymentSetupProxy:setup.createPaymentSetupHandler()});}
 catch{await payment.close();throw Error();}
}).catch(()=>{console.error('FaraiOS TEST payment startup refused');process.exitCode=1;});
