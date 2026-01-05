using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebAppDev.AuthApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomBookingsRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RoomsId",
                table: "RoomBookings",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RoomBookings_RoomsId",
                table: "RoomBookings",
                column: "RoomsId");

            migrationBuilder.AddForeignKey(
                name: "FK_RoomBookings_Rooms_RoomsId",
                table: "RoomBookings",
                column: "RoomsId",
                principalTable: "Rooms",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RoomBookings_Rooms_RoomsId",
                table: "RoomBookings");

            migrationBuilder.DropIndex(
                name: "IX_RoomBookings_RoomsId",
                table: "RoomBookings");

            migrationBuilder.DropColumn(
                name: "RoomsId",
                table: "RoomBookings");
        }
    }
}
