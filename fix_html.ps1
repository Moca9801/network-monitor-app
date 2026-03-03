$f = "frontend\src\app\components\dashboard\dashboard.component.html"

# 1. Normalize double CRLF -> single CRLF
$c = [System.IO.File]::ReadAllText($f)
$c = $c.Replace("`r`r`n", "`r`n")

# 2. Add missing </div> for the sede *ngFor before </main>
$old = "      </div>`r`n  </main>"
$new = "      </div>`r`n    </div>`r`n  </main>"
if ($c.Contains($old)) {
    $c = $c.Replace($old, $new)
    Write-Host "Fixed: added missing sede </div>"
}
else {
    Write-Host "Pattern not found — printing snippet around </main>"
    $idx = $c.IndexOf("</main>")
    Write-Host $c.Substring([Math]::Max(0, $idx - 100), 150)
}

[System.IO.File]::WriteAllText($f, $c, [System.Text.UTF8Encoding]::new($false))
Write-Host "Done"
