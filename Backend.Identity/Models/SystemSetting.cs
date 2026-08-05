using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Identity.Models;

[Table("system_settings")]
public class SystemSetting
{
    [Key]
    [MaxLength(100)]
    [Column("key")]
    public string Key { get; set; } = string.Empty;

    [Required]
    [Column("value")]
    public string Value { get; set; } = string.Empty;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}