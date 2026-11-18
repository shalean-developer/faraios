<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(404);exit;}
require_once __DIR__.'/platform-directory.php';
final class PlatformSupport {
 public function __construct(private readonly Closure $identity,private readonly Closure $settings){}
 public function read(string $method,array $query):array {
  try{$u=($this->identity)();$p=($this->settings)();}catch(Throwable $e){throw new PlatformDirectoryError(401,'Sign in again to continue.');}
  if(!is_array($u)||!is_array($p)||!platform_authorized($u,$p))throw new PlatformDirectoryError(403,'Platform owner access required.');
  if($method!=='GET')throw new PlatformDirectoryError(405,'Support status is read-only.');
  if($query!==[])throw new PlatformDirectoryError(400,'Open support without additional filters.');
  // No inbox, customer records, business enquiries or credentials are read here.
  return ['operator'=>'Farai Chitekedza','email'=>'hello@faraios.com','hours'=>'Monday–Friday, 08:00–17:00','timezone'=>'Africa/Johannesburg','normal'=>'One business day','critical'=>'One covered hour','policy_checked'=>'18 November 2026','case_source'=>'unavailable','cases'=>null,'case_count'=>null,'case_checked'=>null];
 }
}
function platform_support():PlatformSupport {
 return new PlatformSupport(static function():array {
  if(!is_file(__DIR__.'/platform-session.php'))throw new RuntimeException('Production session adapter unavailable');
  require_once __DIR__.'/platform-session.php';start();return user();
 },static fn():array=>platform_settings());
}
