<?php
declare(strict_types=1);
function service_image_alt(): string {
 $alt=trim(is_string($_POST['image_alt']??null)?$_POST['image_alt']:'');
 if(!preg_match('//u',$alt)||mb_len($alt)>200||preg_match('/[\x00-\x1f\x7f]/',$alt))throw new RuntimeException('Describe the service image in up to 200 characters.');
 return $alt;
}
function service_image_upload(): ?array {
 $f=$_FILES['service_image']??null;
 if(!$f||$f['error']===UPLOAD_ERR_NO_FILE)return null;
 if($f['error']!==UPLOAD_ERR_OK||!is_uploaded_file($f['tmp_name']))throw new RuntimeException('The service image could not upload. Choose an image up to 150 KB.');
 try{return profile_logo(file_get_contents($f['tmp_name']));}
 catch(RuntimeException $e){throw new RuntimeException('Choose a PNG, JPG or WebP service image up to 150 KB and 2000 × 2000 pixels.');}
}
function service_image_response(?array $image): never {
 header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Robots-Tag: noindex,nofollow');
 try{
  if(!$image||!isset($image['data'],$image['mime']))throw new RuntimeException('Image unavailable.');
  $raw=base64_decode($image['data'],true);$valid=profile_logo($raw?:'');
  if($valid['mime']!==$image['mime'])throw new RuntimeException('Image unavailable.');
  header('Content-Type: '.$valid['mime']);echo $raw;
 }catch(Throwable $e){http_response_code(404);}
 exit;
}
function service_image_markup(array $s,string $endpoint): string {
 if(empty($s['photo'])||!preg_match('/\A[a-f0-9]{32}\z/',$s['id']??'')||$endpoint==='')return '';
 return '<img class="service-photo" src="'.esc($endpoint.rawurlencode($s['id'])).'" alt="'.esc($s['photo']['alt']??'').'" width="640" height="400" loading="lazy" decoding="async">';
}
