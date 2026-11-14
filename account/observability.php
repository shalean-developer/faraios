<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
// No content, paths, URLs, tokens, email, business IDs or exception messages enter these events.
function ops_preview(array $c): bool {
 $path=parse_url((string)($c['base_url']??''),PHP_URL_PATH)?:'';
 return $path==='/_accounts-preview'||(($c['environment']??'')==='test'&&$path==='/preview');
}
function ops_event(array $c,string $event,string $operation,int $status): void {
 if(!ops_preview($c)||!in_array($event,['upstream_failure','workflow_failure','php_fatal'],true))return;
 if(!in_array($operation,['auth','invoice','quote','booking','enquiry','publication','other','php'],true))$operation='other';
 static $id=null;$id??=bin2hex(random_bytes(12));
 $record=['schema'=>'faraios.ops.v1','time'=>gmdate('c'),'environment'=>'preview','event'=>$event,'operation'=>$operation,'status'=>$status>=0&&$status<=599?$status:0,'request_id'=>$id];
 error_log(json_encode($record,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
}
function ops_operation(string $path): string {
 if(str_starts_with($path,'/auth/'))return 'auth';
 foreach(['invoice','quote','booking','enquiry'] as $name)if(str_starts_with($path,'/rest/v1/rpc/business_'.$name.'_'))return $name;
 if(str_starts_with($path,'/rest/v1/rpc/business_profile_')||str_starts_with($path,'/rest/v1/rpc/business_services_'))return 'publication';
 return 'other';
}
function ops_install(array $c): void {
 if(!ops_preview($c))return;
 set_exception_handler(static function(Throwable $e)use($c):void{ops_event($c,'php_fatal','php',500);if(PHP_SAPI!=='cli'){http_response_code(500);header('Cache-Control: no-store');}echo 'Service temporarily unavailable. Please try again.';});
 register_shutdown_function(static function()use($c):void{$e=error_get_last();if($e&&in_array($e['type'],[E_ERROR,E_PARSE,E_CORE_ERROR,E_COMPILE_ERROR],true))ops_event($c,'php_fatal','php',500);});
}
