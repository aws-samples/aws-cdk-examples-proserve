Set-ExecutionPolicy Unrestricted
Import-Module WebAdministration    

$s3CertificateBucket = "##replace_with_certificate_bucket_name##"
$iisAppPoolName = "##replace_with_app_pool_name##"    
$iisAppPoolDotNetVersion = "v4.0"    
    
$iisWebsiteFolderPath = "C:\inetpub\wwwroot\##replace_with_app_pool_name##"    
$iisWebsiteName = "##replace_with_app_pool_name##"    
  
$thumbprint = Get-ChildItem  -Path Cert:\LocalMachine\MY | Where-Object {$_.Subject -Match "##replace_with_ssl_cert_host_name##"} | Select-Object FriendlyName, Thumbprint, Subject, NotBefore, NotAfter
Write-Host $thumbprint.Thumbprint

$iisWebsiteBindings = $null
if (-not ([string]::IsNullOrEmpty($bucket)))
{
    $iisWebsiteBindings = @(
    @{protocol="https";bindingInformation="*:443:##replace_with_bindinghost##";hostHeader="##replace_with_bindinghost##";SSLFlags=1}   
    )
}
else{
    $iisWebsiteBindings = @(
   @{protocol="http";bindingInformation="*:90:##replace_with_bindinghost##";hostHeader="##replace_with_bindinghost##"}   
)
} 
    
if (!(Test-Path IIS:\AppPools\$iisAppPoolName -pathType container))    
{   
    Write-Host "App Pool Not exists. Create new App Pool"
    New-Item IIS:\AppPools\$iisAppPoolName    
    Set-ItemProperty IIS:\AppPools\$iisAppPoolName -name "managedRuntimeVersion" -value $iisAppPoolDotNetVersion    
}    
    
if (!(Test-Path IIS:\Sites\$iisWebsiteName -pathType container))    
{
    Write-Host "Website Not exists. Create new Website with IIS Binding"
    New-Item IIS:\Sites\$iisWebsiteName -bindings $iisWebsiteBindings -physicalPath $iisWebsiteFolderPath    
    Set-ItemProperty IIS:\Sites\$iisWebsiteName -name applicationPool -value $iisAppPoolName 
    Write-Host "set cerficate for the site if https protocol configured"   
    if (-not ([string]::IsNullOrEmpty($bucket))){
        Write-Host (Get-WebBinding -Name $iisWebsiteName -Port 443 -Protocol "https")
        (Get-WebBinding -Name $iisWebsiteName -Port 443 -Protocol "https").AddSslCertificate($thumbprint.Thumbprint, "My")  
    }
} 

Import-Module AWSPowerShell

[string]$SecretAD  = "##replace_with_domain##-web-password"
$SecretObj = Get-SECSecretValue -SecretId $SecretAD
[PSCustomObject]$Secret = ($SecretObj.SecretString  | ConvertFrom-Json)
$username = $Secret.Domain + '\' + $Secret.UserID
Set-ItemProperty IIS:\AppPools\$iisAppPoolName -name processModel.identityType -Value SpecificUser 

Set-ItemProperty IIS:\AppPools\$iisAppPoolName -name processModel.userName -Value $username

Set-ItemProperty IIS:\AppPools\$iisAppPoolName -name processModel.password -Value $Secret.Password 

& {iisreset} 