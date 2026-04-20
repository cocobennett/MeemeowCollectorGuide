# MeemeowCollectorGuide

## Development

Go to [Google Scripts](https://script.google.com) and click on **Meemeow Collectors Guide**.

After making changes, click **Deploy** -> **New development** -> **Deploy** to see your changes.

### Google Sheets Format

| Sheet Name | Columns                                                                            | Total Columns | Topic           | Description                                                                     |
| :--------- | :--------------------------------------------------------------------------------- | :------------ | :-------------- | :------------------------------------------------------------------------------ |
| MasterList | Name, Litter/Series, Exclusive, Forms, Original Price, Image, Release Date, Rarity | 8             | Meemeow Catalog | The primary database of all Meemeow characters, their releases, and attributes. |
| UserData   | Email, MeemeowId, Status, Form, Date                                               | 3             | User Data       | Tracks user-specific information including associated Meemeow IDs and status.   |

**Exclusive Options:**
* `No`
* `Claire's`
* `VidCon`

**Forms Options:**
* `6" plush`
* `11" plush`
* `figure`
* `squishy`

### Domain

Domain meemeowtracker.com hosted on Cloudflare
