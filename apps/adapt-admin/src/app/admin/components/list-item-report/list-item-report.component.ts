import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IReportModel } from '@adapt/types';

@Component({
  selector: 'adapt-list-item-report',
  standalone: false,
  templateUrl: './list-item-report.component.html',
  styleUrls: ['./list-item-report.component.scss'],
})
export class ListItemReportComponent {
  // TODO: Ask about the IReport interface and where "description" is meant to live as it appears to be part of the ITemplate type
  @Input() report!: any;
  @Input() headingLvl: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' = 'h3';
  @Input() onLandingPage = false;

  @Output() unPublish = new EventEmitter();
  @Output() publish = new EventEmitter();
  @Output() deleteRequested = new EventEmitter<IReportModel>();

  get showDeleteAction() {
    return this.deleteRequested.observed;
  }

  get navPath() {
    return this.onLandingPage ? [this.report.reportID] : 'reports/' + [this.report.reportID];
  }

  public publishReport(report: IReportModel) {
    this.publish.emit(report);
  }

  public requestDelete(report: IReportModel) {
    this.deleteRequested.emit(report);
  }
}
