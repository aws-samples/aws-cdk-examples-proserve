[string]$SecretADUser  = "##replace_with_domain##-web-password"
$SecretADUserObj = Get-SECSecretValue -SecretId $SecretADUser
[PSCustomObject]$SecretADUser = ($SecretADUserObj.SecretString  | ConvertFrom-Json)
$adUserpassword   = $SecretADUser.Password | ConvertTo-SecureString -asPlainText -Force

[string]$SecretAD  = "##replace_with_domain##-managed-ad-Admin-password"
$SecretObj = Get-SECSecretValue -SecretId $SecretAD
[PSCustomObject]$Secret = ($SecretObj.SecretString  | ConvertFrom-Json)
$password   = $Secret.Password | ConvertTo-SecureString -asPlainText -Force
$username   = $Secret.UserID + "@" + $Secret.Domain
$credential = New-Object System.Management.Automation.PSCredential($username,$password)

Import-Module ActiveDirectory
[string]$Username = "##replace_with_domain_user_name##"
try {
    # Get-ADUser -Identity $Username
    New-ADUser -Credential $credential -Name $Username -GivenName $Username -Surname $Username -SamAccountName $Username -UserPrincipalName $Username -AccountPassword $adUserpassword -Enabled $true -CannotChangePassword $true -PasswordNeverExpires $true
    Write-Host "Create User as User not exists"
}
catch [Microsoft.ActiveDirectory.Management.ADIdentityResolutionException] {
    Write-Host "User exists"
} 
# Add AD user as Local Admin
Add-LocalGroupMember -Group "Administrators" -Member $("##replace_with_domain##\" + $Username)