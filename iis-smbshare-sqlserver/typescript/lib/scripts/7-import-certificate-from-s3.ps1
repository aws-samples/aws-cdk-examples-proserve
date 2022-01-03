Import-Module AWSPowerShell
$bucket = '##replace_with_certificate_bucket_name##'
if (-not ([string]::IsNullOrEmpty($bucket)))
{
    $objects = Get-S3Object -BucketName $bucket

    $localPath = 'c:\Users\Administrator\Downloads' 
    $localFilePath = ''
    foreach ($object in $objects) { 
        $fileName = $object.Key 
        foreach($file in $fileName) { 
            $localFilePath = Join-Path $localPath $file 
            Copy-S3Object -BucketName $bucket -Key $object.Key -LocalFile $localFilePath 
        }
    }

    Write-Host $localFilePath


    $Pass = ConvertTo-SecureString -String '##replace_with_certificate_password##' -Force -AsPlainText
    $User = "whatever"
    $Cred = New-Object -TypeName "System.Management.Automation.PSCredential" -ArgumentList $User, $Pass
    Import-PfxCertificate -FilePath $localFilePath -CertStoreLocation Cert:\LocalMachine\My -Password $Cred.Password
}