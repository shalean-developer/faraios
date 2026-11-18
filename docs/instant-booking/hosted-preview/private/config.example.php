<?php
return ['environment'=>'preview','enabled'=>true,'instant_test_enabled'=>true,'base_url'=>'https://www.faraios.com/account/_book05-preview',
 'supabase_url'=>'https://jqnecahhaxxdsrybwuoo.supabase.co','publishable_key'=>'SET_PREVIEW_PUBLISHABLE_KEY',
 'instant_paystack_key'=>trim(file_get_contents('/var/www/vhosts/shalean.com/private/faraios-checkout-preview/paystack-test.key'))];
