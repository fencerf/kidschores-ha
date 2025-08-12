const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace")
);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class KidsChoresCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _chores: { type: Array },
      _kids: { type: Array },
      _dialogOpen: { type: Boolean },
      _dialogChore: { type: Object },
    };
  }

  constructor() {
    super();
    this._chores = [];
    this._kids = [];
    this._dialogOpen = false;
    this._dialogChore = null;
  }

  setConfig(config) {
    this._config = config;
    this._getChores();
    this._getKids();
  }

  updated(changedProperties) {
    if (changedProperties.has("hass")) {
      this._getChores();
      this._getKids();
    }
  }

  _getKids() {
    if (!this.hass) {
      return;
    }
    const kidsSensor = this.hass.states["sensor.kidschores_kids"];
    if (kidsSensor) {
      this._kids = Object.values(kidsSensor.attributes.kids);
    }
  }

  _getChores() {
    if (!this.hass) {
      return;
    }
    const choresSensor = this.hass.states["sensor.kidschores_chores"];
    if (choresSensor) {
      this._chores = Object.values(choresSensor.attributes.chores);
    }
  }

  render() {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card header="Kids Chores Management">
        <div class="card-content">
          <table>
            <thead>
              <tr>
                <th>Chore</th>
                <th>Points</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this._chores.map(
                (chore) => html`
                  <tr>
                    <td>${chore.name}</td>
                    <td>${chore.default_points}</td>
                    <td>
                      <mwc-button @click=${() => this._editChore(chore.internal_id)}>Edit</mwc-button>
                      <mwc-button @click=${() => this._deleteChore(chore.internal_id)}>Delete</mwc-button>
                    </td>
                  </tr>
                `
              )}
            </tbody>
          </table>
          <div class="add-chore">
            <mwc-button raised @click=${() => this._addChore()}>Add Chore</mwc-button>
          </div>
        </div>
        ${this._renderDialog()}
      </ha-card>
    `;
  }

  _renderDialog() {
    if (!this._dialogOpen) {
      return html``;
    }

    const schema = [
      { name: "chore_name", selector: { text: {} } },
      { name: "chore_description", selector: { text: { multiline: true } } },
      { name: "default_points", selector: { number: { mode: "box", min: 0, step: 1 } } },
      {
        name: "assigned_kids",
        selector: {
          select: {
            multiple: true,
            options: this._kids.map((kid) => ({
              value: kid.internal_id,
              label: kid.name,
            })),
          },
        },
      },
      { name: "shared_chore", selector: { boolean: {} } },
      { name: "allow_multiple_claims_per_day", selector: { boolean: {} } },
      { name: "partial_allowed", selector: { boolean: {} } },
      { name: "icon", selector: { icon: {} } },
      {
        name: "recurring_frequency",
        selector: {
          select: {
            options: ["none", "daily", "weekly", "biweekly", "monthly"],
          },
        },
      },
      { name: "due_date", selector: { datetime: {} } },
    ];

    return html`
      <ha-dialog
        open
        @closed=${this._closeDialog}
        .heading=${this._dialogChore && this._dialogChore.internal_id ? "Edit Chore" : "Add Chore"}
      >
        <div class="form">
          <ha-form
            .hass=${this.hass}
            .data=${this._dialogChore}
            .schema=${schema}
            @value-changed=${this._handleFormValueChanged}
          ></ha-form>
        </div>
        <mwc-button slot="secondaryAction" @click=${this._closeDialog}>
          Cancel
        </mwc-button>
        <mwc-button slot="primaryAction" @click=${this._saveChore}>
          Save
        </mwc-button>
      </ha-dialog>
    `;
  }

  _addChore() {
    this._dialogChore = {};
    this._dialogOpen = true;
  }

  _editChore(choreId) {
    const chore = this._chores.find(c => c.internal_id === choreId);
    if (chore) {
      this._dialogChore = {
          internal_id: chore.internal_id,
          chore_name: chore.name,
          chore_description: chore.description,
          default_points: chore.default_points,
          assigned_kids: chore.assigned_kids,
          shared_chore: chore.shared_chore,
          allow_multiple_claims_per_day: chore.allow_multiple_claims_per_day,
          partial_allowed: chore.partial_allowed,
          icon: chore.icon,
          recurring_frequency: chore.recurring_frequency,
          due_date: chore.due_date,
      };
      this._dialogOpen = true;
    }
  }

  _closeDialog() {
    this._dialogOpen = false;
    this._dialogChore = null;
    this.requestUpdate();
  }

  _handleFormValueChanged(e) {
      this._dialogChore = e.detail.value;
  }

  _saveChore() {
    if (!this._dialogChore) {
      return;
    }

    const serviceData = { ...this._dialogChore };
    if (serviceData.internal_id) {
        serviceData.chore_id = serviceData.internal_id;
        delete serviceData.internal_id;
        this.hass.callService("kidschores", "update_chore", serviceData);
    } else {
        this.hass.callService("kidschores", "add_chore", serviceData);
    }

    this._closeDialog();
  }

  _deleteChore(choreId) {
    if (confirm("Are you sure you want to delete this chore?")) {
      this.hass.callService("kidschores", "delete_chore", {
        chore_id: choreId,
      });
    }
  }

  static get styles() {
    return css`
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        padding: 8px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      .add-chore {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }
    `;
  }
}

customElements.define("kidschores-card", KidsChoresCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "kidschores-card",
  name: "Kids Chores Card",
  description: "A card to manage kids chores.",
});
