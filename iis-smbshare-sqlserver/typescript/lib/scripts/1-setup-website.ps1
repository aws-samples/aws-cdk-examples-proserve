Import-Module ServerManager;
Install-WindowsFeature -name Web-Server -IncludeManagementTools
# Install asp.net
Install-WindowsFeature Web-Asp-Net45

Import-Module WebAdministration
Import-Module AWSPowerShell

$instancetype = Invoke-RestMethod  http://169.254.169.254/latest/meta-data/instance-type
$instanceid= Invoke-RestMethod http://169.254.169.254/latest/meta-data/instance-id
$az= Invoke-RestMethod http://169.254.169.254/latest/meta-data/placement/availability-zone
$computername = $env:computername

$testparams = "<br><br>Hello from " + $computername + " instanceid: " + $instanceid + 
            "<br><br>I am running on " + $instancetype + " in availability zone " + $az
$testparams | Out-File 'C:\\inetpub\\wwwroot\\index.html'
# This should be the actual web application which gets deployed using code deploy agent
New-Item -Path 'C:\\inetpub\\wwwroot\\my-web-app' -ItemType Directory
$testparams | Out-File 'C:\\inetpub\\wwwroot\\my-web-app\\index.html' 


$str_document = @'
<%@ Page Language="C#" %>
<script runat="server">
    private void Page_Load() {
        Msg.Text = "Hello ASP.NET World!";
    }
</script>
<html>
<body>
    <asp:Label runat="server" id="Msg" />
</body>
</html>
'@ 
$str_document > 'C:\\inetpub\\wwwroot\\index.aspx'