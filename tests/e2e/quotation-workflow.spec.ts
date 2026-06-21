import { expect, test } from "@playwright/test";

test("creates, allocates, pays, and downloads project documents", async ({ page }) => {
  const suffix = Date.now().toString();

  await page.goto("/customers/new");
  await page.getByLabel("Name", { exact: true }).fill(`Customer ${suffix}`);
  await page.getByLabel("Email", { exact: true }).fill(`customer-${suffix}@example.com`);
  await page.getByRole("button", { name: "Create customer" }).click();
  await expect(page.getByRole("heading", { name: `Customer ${suffix}` })).toBeVisible();

  await page.getByRole("link", { name: "New project" }).click();
  await page.getByLabel("Project name").fill(`Project ${suffix}`);
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.getByRole("heading", { name: `Project ${suffix}` })).toBeVisible();

  await page.getByRole("link", { name: "New quotation" }).click();
  await page.getByLabel("Title").fill("Design engagement");
  await page.getByLabel("Description", { exact: true }).fill("Design and implementation");
  await page.getByLabel("Quantity", { exact: true }).fill("10");
  await page.getByLabel("Unit", { exact: true }).fill("hour");
  await page.getByLabel("Unit price", { exact: true }).fill("125");
  await page.getByRole("button", { name: "Create quotation" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "$1,250.00" })).toBeVisible();

  const issue = page.getByRole("button", { name: "Issue", exact: true });
  await issue.focus();
  await issue.press("Enter");
  await expect(page.getByRole("dialog", { name: "Issue this document?" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Issue this document?" })).toBeHidden();
  await issue.click();
  await page.getByRole("dialog", { name: "Issue this document?" }).getByRole("button", { name: "Issue", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Q-\d{4}-\d{4}$/ })).toBeVisible();

  await page.getByRole("button", { name: "Mark accepted" }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await page.getByLabel(/Design and implementation.*remaining/).fill("4");
  await page.getByRole("button", { name: "Create invoice draft" }).click();
  await expect(page.getByRole("definition").filter({ hasText: "$500.00" })).toBeVisible();

  await page.getByRole("button", { name: "Issue", exact: true }).click();
  await page.getByRole("dialog", { name: "Issue this document?" }).getByRole("button", { name: "Issue", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^INV-\d{4}-\d{4}$/ })).toBeVisible();
  await page.getByLabel("Amount", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.locator(".metric").filter({ hasText: "$300.00" })).toBeVisible();
  await expect(page.getByText("partially paid", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^INV-\d{4}-\d{4}-r1\.pdf$/);
});
