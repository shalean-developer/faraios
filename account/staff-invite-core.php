<?php
declare(strict_types=1);
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__){http_response_code(403);exit;}
function staff_invite_config(): array {
 $path=getenv('FARAIOS_STAFF_INVITE_CONFIG')?:'/var/www/vhosts/shalean.com/private/faraios-staff-invite/web.php';
 $real=realpath($path);$root=realpath(dirname(__DIR__));
 if(!$real||str_starts_with($real,$root.'/'))throw new RuntimeException('Staff invitations are not configured.');
 $c=require $real;if(!is_array($c)||($c['enabled']??false)!==true||strlen($c['public_key']??'')!==64)throw new RuntimeException('Staff invitations are unavailable.');return $c;
}
function staff_invite_send(array $scope,string $staff,string $role,?string $replace=null): void {
 $c=staff_invite_config();$token=bin2hex(random_bytes(32));$public=hex2bin($c['public_key']);
 $sealed=base64_encode(sodium_crypto_box_seal($token,$public));
 api('/rest/v1/rpc/business_staff_invite',$scope+['p_staff'=>$staff,'p_role'=>$role,'p_hash'=>hash('sha256',$token),'p_sealed'=>$sealed,'p_replace'=>$replace],'POST',$_SESSION['auth']['access_token']);
}
