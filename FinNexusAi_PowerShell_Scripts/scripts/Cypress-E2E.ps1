# Cypress-E2E.ps1
# Requires: npm install cypress --save-dev

param(
    [string]$BaseUrl = "http://localhost:3000"
)

# Generate basic E2E spec if none exists
if (-not (Test-Path "cypress/e2e/trading.cy.js")) {
    $e2eSpec = @"
describe('FinAI Nexus E2E', () => {
  it('Logs in and trades', () => {
    cy.visit('$BaseUrl');
    cy.get('[data-cy=login]').type('user@example.com');
    cy.get('[data-cy=submit]').click();
    cy.get('[data-cy=portfolio]').should('be.visible');
    cy.get('[data-cy=buy-eth]').click();  // Test HFT buy
  });
});
"@
    $e2eSpec | Out-File -FilePath "cypress/e2e/trading.cy.js" -Encoding UTF8
    Write-Host "Generated E2E spec: cypress/e2e/trading.cy.js" -ForegroundColor Green
}

# Run E2E tests
npx cypress run --spec "cypress/e2e/*.cy.js" --config baseUrl='$BaseUrl' --headed --browser chrome

Write-Host "E2E tests complete. Videos in cypress/videos/." -ForegroundColor Green
